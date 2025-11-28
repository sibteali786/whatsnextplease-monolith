import { COOKIE_NAME } from '../constant';
import { getCookie } from '../utils';

interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

interface PrefixSuggestion {
  prefix: string;
  isUnique: boolean;
  categoryName: string;
}

interface PrefixCheck {
  prefx: string;
  isUnique: boolean;
  available: boolean;
}

interface SerialNumberValidation {
  serialNumber: string;
  isValid: boolean;
  isAvailable: boolean;
  exists: boolean;
  components?: {
    prefix: string;
    number: number;
  };
  reason?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export class SerialNumber {
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
    };
  }

  /**
   * Get suggested prefix for a category
   */
  async getSuggestedPrefixForCategory(categoryId: string): Promise<ApiResponse<PrefixSuggestion>> {
    console.log('Fetching suggested prefix for category', categoryId);
    const response = await fetch(
      `${API_BASE}/task-sequences/suggest-prefix?categoryId=${categoryId}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch suggested prefix');
    }

    return response.json();
  }

  /**
   * Check if a prefix is unique/available
   */
  async checkPrefixUniqueness(prefix: string): Promise<ApiResponse<PrefixCheck>> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/task-sequences/check-prefix?prefix=${encodeURIComponent(prefix)}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to check prefix uniqueness');
    }

    return response.json();
  }

  /**
   * Validate a serial number format and availability
   */
  async validateSerialNumber(serialNumber: string): Promise<ApiResponse<SerialNumberValidation>> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/task-sequences/validate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ serialNumber }),
    });

    if (!response.ok) {
      throw new Error('Failed to validate serial number');
    }

    return response.json();
  }

  /**
   * Get task by serial number
   */
  async getTaskBySerialNumber(serialNumber: string) {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/tasks/by-serial/${encodeURIComponent(serialNumber)}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Task not found');
      }
      throw new Error('Failed to fetch task');
    }

    return response.json();
  }
}

export const serialNumberAPI = new SerialNumber();
