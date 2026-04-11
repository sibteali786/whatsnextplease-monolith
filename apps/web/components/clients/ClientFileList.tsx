'use client';

import { FileTable } from './file-table';
import { UploadContextType } from '@/utils/validationSchemas';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { FileIdsByUserId } from '@/types/tasks/api-response';

export default function ClientFileList({ clientId }: { clientId: string }) {
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const loadFileIds = async () => {
      try {
        const params: Record<string, string | number> = {};
        params.entityType = 'client';
        const result = await apiClient.get<FileIdsByUserId>(`/files/user/${clientId}/ids`, {
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
  }, [clientId]);

  if (loading) {
    return <div>Loading files...</div>;
  }

  return (
    <div>
      <FileTable id={clientId} fileIds={fileIds ?? []} context={UploadContextType.CLIENT_PROFILE} />
    </div>
  );
}
