/* eslint-disable @typescript-eslint/no-explicit-any */
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

  async generateDownloadUrl(
    fileId: string,
    options?: {
      forceDownload?: boolean;
      openInNewTab?: boolean;
    }
  ): Promise<APIResponse> {
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

      // Enhanced download handling
      if (result.success && result.downloadUrl) {
        const fileName = result.fileName || 'download';
        const fileExtension = fileName.split('.').pop()?.toLowerCase();

        // File types that should open in new tab instead of downloading
        const viewableTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'html', 'htm'];
        const shouldOpenInNewTab =
          options?.openInNewTab ||
          (!options?.forceDownload && viewableTypes.includes(fileExtension || ''));

        if (shouldOpenInNewTab) {
          // Open in new tab for viewable files
          window.open(result.downloadUrl, '_blank');
        } else {
          // Force download for other files
          const link = document.createElement('a');
          link.href = result.downloadUrl;
          link.setAttribute('download', fileName);
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        return {
          success: true,
          data: {
            downloadUrl: result.downloadUrl,
            fileName: result.fileName,
            openedInNewTab: shouldOpenInNewTab,
          },
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

  // Add these methods to the existing FileAPIClient class

  async uploadCommentFile(formData: FormData): Promise<APIResponse> {
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

  async addFilesToComment(commentId: string, fileIds: string[]): Promise<APIResponse> {
    try {
      const response = await fetch(`${this.baseURL}/comments/${commentId}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify({ fileIds }),
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

  async removeFileFromComment(commentId: string, fileId: string): Promise<APIResponse> {
    try {
      const response = await fetch(`${this.baseURL}/comments/${commentId}/files/${fileId}`, {
        method: 'DELETE',
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

  async generatePreviewUrl(fileId: string): Promise<APIResponse> {
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

      // Return URL without any automatic download/opening behavior
      if (result.success && result.downloadUrl) {
        return {
          success: true,
          data: {
            downloadUrl: result.downloadUrl,
            fileName: result.fileName,
          },
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
