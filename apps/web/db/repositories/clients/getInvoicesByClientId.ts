import prisma from "@/db/db";
import "server-only";
import {
  GetInvoicesByClientIdResponse,
  GetInvoicesByClientIdResponseSchema,
  InputParamsSchema,
  InvoiceSchema,
} from "@/utils/validationSchemas";
import logger from "@/utils/logger";
import { handleError } from "@/utils/errorHandler";

/**
 * Retrieves invoices for a specific client using their client ID.
 *
 * @param clientId - The ID of the client to fetch invoices for.
 * @param cursor - The cursor for pagination to fetch the next set of invoices.
 * @param pageSize - The number of invoices to fetch per page.
 * @returns A promise containing the invoices assigned to the client, pagination information, or an error message.
 */

export const getInvoicesByClientId = async (
  clientId: string,
  cursor: string | null,
  pageSize: number = 10,
): Promise<GetInvoicesByClientIdResponse> => {
  try {
    // Validate input parameters
    InputParamsSchema.parse({ clientId, cursor, pageSize });

    const invoices = await prisma.invoice.findMany({
      where: { clientId },
      take: pageSize + 1, // Fetch one extra record to determine if there's a next page
      ...(cursor && { cursor: { id: cursor }, skip: 1 }), // Skip the cursor itself if provided
      select: {
        id: true,
        invoiceNumber: true,
        date: true,
        amount: true,
        status: true,
        task: {
          select: {
            taskCategory: {
              select: {
                categoryName: true, // Fetching categoryName from the related taskCategory
              },
            },
          },
        },
      },
    });

    const hasNextCursor = invoices.length > pageSize;
    const nextCursor = hasNextCursor ? invoices[pageSize]?.id : null;

    if (hasNextCursor) {
      invoices.pop(); // Remove the extra record if it exists
    }

    const totalCount = await prisma.invoice.count({
      where: { clientId },
    });

    // Transform and validate invoices
    const invoicesData = invoices.map((invoice) => {
      const invoiceData = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.date,
        amount: invoice.amount.toString(),
        status: invoice.status as "PENDING" | "PAID" | "OVERDUE",
        task: {
          categoryName: invoice.task.taskCategory.categoryName,
        },
      };
      // Validate each invoice against the InvoiceSchema
      InvoiceSchema.parse(invoiceData);
      return invoiceData;
    });

    const responseData = {
      success: true,
      invoices: invoicesData,
      hasNextCursor,
      nextCursor,
      totalCount,
    };

    // Validate response data against schema
    return GetInvoicesByClientIdResponseSchema.parse(responseData);
  } catch (error) {
    logger.error({ error }, "Error in getInvoicesByClientId");
    return handleError(
      error,
      "getInvoicesByClientId",
    ) as GetInvoicesByClientIdResponse;
  }
};
