'use server';

import { COOKIE_NAME } from '@/utils/constant';
import { cookies } from 'next/headers';
import {
  CreateCommentInput,
  UpdateCommentInput,
  GetCommentsResponse,
} from '@/utils/commentSchemas';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
export async function createComment(data: CreateCommentInput): Promise<{
  success: boolean;
  comment?: any;
  message?: string;
  error?: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tasks/${data.taskId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        content: data.content,
        fileIds: data.fileIds,
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create comment',
    };
  }
}

export async function getComments(
  taskId: string,
  cursor?: string,
  pageSize: number = 20
): Promise<GetCommentsResponse> {
  try {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('pageSize', pageSize.toString());

    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/comments?${params.toString()}`, {
      method: 'GET',
      headers: {
        ...headers,
      },
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch comments',
    };
  }
}

export async function updateComment(data: UpdateCommentInput): Promise<{
  success: boolean;
  comment?: any;
  message?: string;
  error?: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/comments/${data.commentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        content: data.content,
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update comment',
    };
  }
}

export async function deleteComment(commentId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        ...headers,
      },
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete comment',
    };
  }
}
