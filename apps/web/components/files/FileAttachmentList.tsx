import { Button } from "../ui/button";
import { Download, Trash2, Loader2 } from "lucide-react";
import { getFileExtension } from "@/utils/fileUtils";
import FileTypeIcon from "../common/FileTypeIcon";
import {
  FileSchemaType,
  TaskFile,
  type FileAttachmentsList,
} from "@/utils/validationSchemas";

interface FileAttachmentsListProps {
  files: TaskFile[];
  onDownload?: (file: FileSchemaType) => void;
  onDelete?: (fileId: string) => void;
  loadingFileIds?: string[]; // New prop for tracking loading states
}

export function FileAttachmentsList({
  files,
  onDownload,
  onDelete,
  loadingFileIds,
}: FileAttachmentsListProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Attachments:</h3>
      <div className="flex flex-col gap-2">
        {files.map((tf) => {
          const isFileLoading = loadingFileIds
            ? loadingFileIds.includes(tf.file.id)
            : false;

          return (
            <div
              key={tf.file.id}
              className="flex items-center justify-between border p-2 rounded-md relative"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <FileTypeIcon fileType={getFileExtension(tf.file.fileName)} />
                  {isFileLoading && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium">{tf.file.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {tf.file.fileSize}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {onDownload && (
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1"
                    onClick={() => onDownload(tf.file)}
                    disabled={isFileLoading}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1"
                    onClick={() => onDelete(tf.file.id)}
                    disabled={isFileLoading}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
