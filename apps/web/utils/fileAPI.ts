/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient, ApiError } from '@/lib/apiClient';

interface APIResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

interface DownloadResult {
  downloadUrl: string;
  fileName: string;
  openedInNewTab?: boolean;
}

const VIEWABLE_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'html', 'htm']);

class FileAPIClient {
  /**
   * Upload a file. Used for both task attachments and comment files.
   * Previously duplicated as uploadFile + uploadCommentFile — consolidated.
   */
  async uploadFile(formData: FormData): Promise<APIResponse> {
    try {
      const result = await apiClient.post<APIResponse>('/files/upload-and-save', formData);
      return result;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteFile(fileId: string): Promise<APIResponse> {
    try {
      return await apiClient.delete<APIResponse>(`/files/${fileId}`);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getFileDetails(fileId: string): Promise<APIResponse> {
    try {
      return await apiClient.get<APIResponse>(`/files/${fileId}`);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Fetches a signed download URL and triggers download/open based on file type.
   * Pass forceDownload=true to always download, openInNewTab=true to always open in tab.
   */
  async generateDownloadUrl(
    fileId: string,
    options?: { forceDownload?: boolean; openInNewTab?: boolean }
  ): Promise<APIResponse> {
    try {
      const result = await apiClient.get<{
        success: boolean;
        downloadUrl?: string;
        fileName?: string;
      }>(`/files/${fileId}/download`);

      if (result.success && result.downloadUrl) {
        const fileName = result.fileName || 'download';
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        const shouldOpenInNewTab =
          options?.openInNewTab || (!options?.forceDownload && VIEWABLE_EXTENSIONS.has(ext));

        if (shouldOpenInNewTab) {
          window.open(result.downloadUrl, '_blank');
        } else {
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
            fileName,
            openedInNewTab: shouldOpenInNewTab,
          } satisfies DownloadResult,
        };
      }

      return { success: false, error: 'No download URL returned' };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Same endpoint as generateDownloadUrl but returns URL only — no side effects.
   * Used for in-app preview (e.g. image/PDF viewer).
   */
  async generatePreviewUrl(fileId: string): Promise<APIResponse> {
    try {
      const result = await apiClient.get<{
        success: boolean;
        downloadUrl?: string;
        fileName?: string;
      }>(`/files/${fileId}/download`);

      if (result.success && result.downloadUrl) {
        const fileName = result.fileName || 'download';
        return {
          success: true,
          data: { downloadUrl: result.downloadUrl, fileName } satisfies Omit<
            DownloadResult,
            'openedInNewTab'
          >,
        };
      }

      return { success: false, error: 'No preview URL returned' };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async addFilesToComment(commentId: string, fileIds: string[]): Promise<APIResponse> {
    try {
      return await apiClient.post<APIResponse>(`/comments/${commentId}/files`, { fileIds });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async removeFileFromComment(commentId: string, fileId: string): Promise<APIResponse> {
    try {
      return await apiClient.delete<APIResponse>(`/comments/${commentId}/files/${fileId}`);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Centralised error handler — maps ApiError (from apiClient) to APIResponse shape.
   * Keeps consumers from having to handle thrown errors.
   */
  private handleError(error: unknown): APIResponse {
    if (error instanceof Error) {
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.message || 'An unexpected error occurred',
      };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export const fileAPI = new FileAPIClient();
