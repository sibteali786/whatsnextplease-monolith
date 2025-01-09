/**
 * Truncate file name to keep the start, the end, and the extension.
 * @param fileName - Full name of the file (including extension)
 * @param maxLength - Maximum allowed length for the display
 * @returns Truncated file name with the format: `start...end.extension`
 */
export const truncateFileName = (
  fileName: string,
  maxLength: number,
): string => {
  const extensionIndex = fileName.lastIndexOf(".");
  const extension = fileName.slice(extensionIndex); // File extension
  const baseName = fileName.slice(0, extensionIndex); // File name without extension

  // If the file name fits within maxLength, return it as is
  if (fileName.length <= maxLength) {
    return fileName;
  }

  // Number of characters to keep at the start and end
  const charsToShow = Math.floor((maxLength - extension.length - 3) / 2);
  const start = baseName.slice(0, charsToShow);
  const end = baseName.slice(-4);

  return `${start}...${end}${extension}`;
};
export const sanitizeFileName = (fileName: string): string => {
  return fileName.replace(/[^a-zA-Z0-9\-_+=.@!]/g, "_").replace(/_{2,}/g, "_");
};

export const ALLOWED_FILE_TYPES = {
  // Documents
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "DOCX",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "PPTX",

  // Spreadsheets
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "text/csv": "CSV",

  // Images
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/gif": "GIF",

  // Video
  "video/mp4": "MP4",
  "video/x-msvideo": "AVI",

  // Archives
  "application/zip": "ZIP",
  "application/x-zip-compressed": "ZIP",

  // Text
  "text/plain": "TXT",
};

export const getFileExtension = (fileName: string): string => {
  return fileName.toLowerCase().split(".").pop() || "";
};

export const getMimeType = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
  };
  return mimeTypes[extension || ""] || "application/octet-stream";
};
