import { apiClient } from '@/lib/apiClient';
import {
  GetTaskBySerialNumberResponse,
  PrefixCheckResponse,
  SerialNumberValidationResponse,
  SuggestPrefixResponse,
} from '@/types/tasks/api-response';

export class SerialNumber {
  async getSuggestedPrefixForCategory(categoryId: string): Promise<SuggestPrefixResponse> {
    return apiClient.get<SuggestPrefixResponse>('/task-sequences/suggest-prefix', {
      params: { categoryId },
    });
  }

  async checkPrefixUniqueness(prefix: string): Promise<PrefixCheckResponse> {
    return apiClient.get<PrefixCheckResponse>('/task-sequences/check-prefix', {
      params: { prefix },
    });
  }

  async validateSerialNumber(serialNumber: string): Promise<SerialNumberValidationResponse> {
    return apiClient.post<SerialNumberValidationResponse>('/task-sequences/validate', {
      serialNumber,
    });
  }

  async getTaskBySerialNumber(serialNumber: string): Promise<GetTaskBySerialNumberResponse> {
    return apiClient.get<GetTaskBySerialNumberResponse>(
      `/tasks/by-serial/${encodeURIComponent(serialNumber)}`
    );
  }
}

export const serialNumberAPI = new SerialNumber();
