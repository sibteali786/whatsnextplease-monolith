'use client';

import { useEffect, useState } from 'react';
import { FileTable } from '../clients/file-table';
import { UploadContextType } from '@/utils/validationSchemas';
import { fetchFilesByUserId, fetchFileIdsByUserId } from '@/actions/fileActions';

export default function UserFileList({ userId }: { userId: string }) {
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFileIds = async () => {
      try {
        const result = await fetchFileIdsByUserId(userId);
        setFileIds(result.fileIds ?? []);
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
      <FileTable
        id={userId}
        fetchData={fetchFilesByUserId} // Pass the server action directly
        fileIds={fileIds}
        context={UploadContextType.USER_PROFILE}
      />
    </div>
  );
}
