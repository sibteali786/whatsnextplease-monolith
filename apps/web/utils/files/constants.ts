const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'svg'];
const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'mkv', 'flv', 'webm'];
const audioExtensions = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'];
const documentExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
const mediaTypes = ['image', 'pdf', 'document', 'other'] as const;
export { imageExtensions, videoExtensions, audioExtensions, documentExtensions, mediaTypes };
