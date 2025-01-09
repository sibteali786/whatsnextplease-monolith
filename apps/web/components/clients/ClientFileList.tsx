import { getFilesByClientId } from "@/db/repositories/clients/getFilesByClientId";
import { FileTable } from "./file-table";
import { getFileIdsByClientId } from "@/utils/clientActions";

const fetchFiles = async (
  id: string,
  cursor: string | null,
  pageSize: number,
) => {
  "use server";
  const { files, success, hasNextCursor, nextCursor, totalCount } =
    await getFilesByClientId(id, cursor, pageSize);
  return { files, success, hasNextCursor, nextCursor, totalCount };
};

export default async function ClientFileList({
  clientId,
}: {
  clientId: string;
}) {
  const fileIds = await getFileIdsByClientId(clientId);
  return (
    <div>
      <FileTable
        id={clientId}
        fetchData={fetchFiles}
        fileIds={fileIds.fileIds ?? []}
      />
    </div>
  );
}
