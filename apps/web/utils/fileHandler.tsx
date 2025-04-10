'use server';
import { postFileData } from '@/db/repositories/files/postFileData';
import { uploadFile } from './clientActions';
import { getCurrentUser } from './user';

export const handleFileUpload = async (file: FormData, clientId: string) => {
  const user = await getCurrentUser();

  try {
    // Retrieve the file object from FormData and ensure it's a File
    const fileEntry = file.get('file');
    if (!(fileEntry instanceof File)) {
      throw new Error('Invalid file provided.');
    }

    // Sanitize the file name by replacing invalid characters
    const sanitizedFileName = fileEntry.name.replace(/[^a-zA-Z0-9\-_+=.@!]/g, '_');

    // Create a new FormData with the sanitized file name
    const sanitizedFormData = new FormData();
    sanitizedFormData.append('file', fileEntry, sanitizedFileName);

    // Upload the sanitized file
    const { success, message } = await uploadFile(sanitizedFormData);
    if (success) {
      const uploadedBy = user.name;
      const savedFile = await postFileData(clientId, user.id, uploadedBy as string, fileEntry);
      return {
        file: savedFile,
        message: 'File saved and uploaded successfully ',
        success: true,
      };
    }
    return {
      success: false,
      message: message,
    };
  } catch (error) {
    console.error('Error while handling file upload:', error);
    throw error;
  }
};
