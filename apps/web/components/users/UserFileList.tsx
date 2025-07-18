// src/app/users/[userId]/files/page.tsx

import { getFilesByUserId } from '@/db/repositories/users/getFilesByUserId';
import { getFileIdsByUserId } from '@/utils/userTools';
import { FileTable } from '../clients/file-table';
import { UploadContextType } from '@/utils/validationSchemas';

const fetchFiles = async (id: string, cursor: string | null, pageSize: number) => {
  'use server';
  const { files, success, hasNextCursor, nextCursor, totalCount } = await getFilesByUserId(
    id,
    cursor,
    pageSize
  );
  return { files, success, hasNextCursor, nextCursor, totalCount };
};

export default async function UserFileList({ userId }: { userId: string }) {
  const fileIds = await getFileIdsByUserId(userId);
  return (
    <div>
      <FileTable
        id={userId}
        fetchData={fetchFiles}
        fileIds={fileIds.fileIds ?? []}
        context={UploadContextType.USER_PROFILE}
      />
    </div>
  );
}
