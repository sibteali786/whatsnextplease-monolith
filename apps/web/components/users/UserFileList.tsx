'use client';

import { useEffect, useState } from 'react';
import { FileTable } from '../clients/file-table';
import { UploadContextType } from '@/utils/validationSchemas';
import { apiClient } from '@/lib/apiClient';
import { FileIdsByUserId } from '@/types/tasks/api-response';

export default function UserFileList({ userId }: { userId: string }) {
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFileIds = async () => {
      try {
        const params: Record<string, string | number> = {};
        params.entityType = 'user';
        const result = await apiClient.get<FileIdsByUserId>(`/files/user/${userId}/ids`, {
          params,
        });
        setFileIds(result.data ?? []);
      } catch (error) {
        console.error('Error loading file IDs:', error);
        setFileIds([]);
      } finally {
        setLoading(false);
      }
    };

    loadFileIds();
  }, [userId]);

  if (loading) {
    return <div>Loading files...</div>;
  }

  return (
    <div>
      <FileTable id={userId} fileIds={fileIds} context={UploadContextType.USER_PROFILE} />
    </div>
  );
}
