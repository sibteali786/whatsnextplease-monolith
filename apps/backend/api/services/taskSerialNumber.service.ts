import { BadRequestError, NotFoundError } from '@wnp/types';
import { logger } from '../utils/logger';
import prisma from '../config/db';
import { Prisma } from '@prisma/client';

export class TaskSerialNumberService {
  constructor() {}

  /**
   * Generate prefix suggestion from category name
   * @private
   */
  private generatePrefixFromName(categoryName: string): string {
    const words = categoryName
      .replace(/[^a-zA-Z\s]/g, '')
      .split(' ')
      .filter(Boolean);

    if (words.length === 1) {
      return words[0].substring(0, 3).toUpperCase();
    } else {
      return words
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 3);
    }
  }

  /**
   * Suggest a prefix for a given category
   * Returns the category's existing prefix or generates a suggestion
   */
  async suggestPrefixForCategory(categoryId: string): Promise<{
    prefix: string;
    isUnique: boolean;
    categoryName: string;
  }> {
    logger.debug(`Suggesting prefix for category ID: ${categoryId}`);

    const category = await prisma.taskCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, categoryName: true, prefix: true },
    });

    if (!category) {
      throw new NotFoundError('Task category not found');
    }

    if (category.prefix) {
      return {
        prefix: category.prefix,
        isUnique: true,
        categoryName: category.categoryName,
      };
    }

    // Gerate a prefix suggestion
    let suggestedPrefix = this.generatePrefixFromName(category.categoryName);
    let isUnique = false;
    let attempts = 0;

    // IF not unqiue, try with numeric suffi
    while (!isUnique && attempts < 10) {
      attempts++;
      suggestedPrefix = `${this.generatePrefixFromName(category.categoryName)}${attempts}`;
      isUnique = await this.checkPrefixUniqueness(suggestedPrefix);
    }

    logger.info(
      { categoryId, suggestedPrefix, isUnique },
      'Generated prefix suggestion for category'
    );

    return {
      prefix: suggestedPrefix,
      isUnique,
      categoryName: category.categoryName,
    };
  }

  /**
   * Check if a prefix is unique (not already in use)
   */
  async checkPrefixUniqueness(prefix: string): Promise<boolean> {
    logger.debug(`Checking uniqueness for prefix: ${prefix}`);

    const existing = await prisma.taskCategory.findUnique({
      where: { prefix: prefix.toUpperCase() },
    });

    return !existing;
  }
  /**
   * Get the next number for a prefix atomically
   * This is the CRITICAL method that prevents race conditions
   * @private
   */
  private async getNextNumber(prefix: string): Promise<bigint> {
    logger.debug(`Getting next number for prefix: ${prefix}`);

    const result = await prisma.$transaction(
      async tx => {
        let sequence = await tx.taskSequence.findUnique({
          where: { prefix },
        });

        if (!sequence) {
          sequence = await tx.taskSequence.create({
            data: {
              prefix,
              currentNumber: BigInt(1),
            },
          });

          return BigInt(1);
        }

        // increment the counter atomically
        const updatedSequence = await tx.taskSequence.update({
          where: { prefix },
          data: { currentNumber: { increment: BigInt(1) } },
          select: { currentNumber: true },
        });

        return updatedSequence.currentNumber;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      }
    );
    logger.info({ prefix, number: result.toString() }, 'Generated next number for prefix');

    return result;
  }

  /**
   * Generate a complete serial number for a given prefix
   * Format: PREFIX-NNNNN (e.g., "WD-00042")
   */

  async generateSerialNumber(prefix: string): Promise<string> {
    logger.info(`Generating serial number for prefix: ${prefix}`);

    const normalizedPrefix = prefix.toUpperCase().trim();

    if (!/^[A-Z0-9]{1,5}$/.test(normalizedPrefix)) {
      throw new BadRequestError(
        'Invalid prefix format. Must be 1-5 alphanumeric characters (A-Z, 0-9).'
      );
    }

    const nextNumber = await this.getNextNumber(normalizedPrefix);

    // Format as 5-digit zero padded number
    const formattedNumber = nextNumber.toString().padStart(5, '0');

    // Combine prefix and number
    const serialNumber = `${normalizedPrefix}-${formattedNumber}`;
    logger.info({ serialNumber, prefix: normalizedPrefix }, 'Serial number generated successfully');
    return serialNumber;
  }
  /**
   * Generate serial number using category's default prefix
   */
  async generateForCategory(categoryId: string): Promise<string> {
    logger.info(`Generating serial number for category ID: ${categoryId}`);

    logger.info({ categoryId }, 'Generating serial number for category');

    // Get category's prefix
    const category = await prisma.taskCategory.findUnique({
      where: { id: categoryId },
      select: { prefix: true, categoryName: true },
    });

    if (!category) {
      throw new NotFoundError('Task category not found');
    }

    if (!category.prefix) {
      throw new BadRequestError(
        `Category "${category.categoryName}" does not have a prefix assigned`
      );
    }

    // Generate serial number with category's prefix
    return this.generateSerialNumber(category.prefix);
  }

  /**
   * Validate that a serial number format is correct
   */
  validateSerialNumberFormat(serialNumber: string): boolean {
    // Format: PREFIX-NNNNN (e.g., "WD-00042")
    const pattern = /^[A-Z0-9]{1,5}-\d{5}$/;
    return pattern.test(serialNumber);
  }
  /**
   * Parse a serial number into its components
   */
  parseSerialNumber(serialNumber: string): { prefix: string; number: number } | null {
    if (!this.validateSerialNumberFormat(serialNumber)) {
      return null;
    }

    const [prefix, numberStr] = serialNumber.split('-');
    return {
      prefix,
      number: parseInt(numberStr, 10),
    };
  }
}
