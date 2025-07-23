// utils/fileAPI.ts
import { COOKIE_NAME } from '@/utils/constant';

interface APIResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

class FileAPIClient {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || '';
  }

  private getAuthToken(): string | undefined {
    if (typeof window !== 'undefined') {
      return document.cookie
        .split('; ')
        .find(row => row.startsWith(`${COOKIE_NAME}=`))
        ?.split('=')[1];
    }
    return undefined;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = this.getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async uploadFile(formData: FormData): Promise<APIResponse> {
    try {
      const response = await fetch(`${this.baseURL}/files/upload-and-save`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.message || result.error || `HTTP ${response.status}`,
        };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async deleteFile(fileId: string): Promise<APIResponse> {
    try {
      const response = await fetch(`${this.baseURL}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.message || result.error || `HTTP ${response.status}`,
        };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async generateDownloadUrl(fileId: string): Promise<APIResponse> {
    try {
      const response = await fetch(`${this.baseURL}/files/${fileId}/download`, {
        method: 'GET',
        headers: {
          ...this.getAuthHeaders(),
        },
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.message || result.error || `HTTP ${response.status}`,
        };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async getFileDetails(fileId: string): Promise<APIResponse> {
    try {
      const response = await fetch(`${this.baseURL}/files/${fileId}`, {
        method: 'GET',
        headers: {
          ...this.getAuthHeaders(),
        },
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.message || result.error || `HTTP ${response.status}`,
        };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }
}

export const fileAPI = new FileAPIClient();
