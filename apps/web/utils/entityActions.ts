'use server';

import { COOKIE_NAME } from '@/utils/constant';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Define supported entity types
export type EntityType = 'user' | 'client';

/**
 * Delete an entity by type and ID
 * @param type The entity type ('user' or 'client')
 * @param id The ID of the entity to delete
 * @returns A Promise resolving to the operation result
 */
export const deleteEntity = async (type: EntityType, id: string) => {
  if (!type || !id) {
    throw new Error('Entity type and ID are required');
  }

  // Validate entity type
  if (type !== 'user' && type !== 'client') {
    throw new Error('Invalid entity type. Must be "user" or "client"');
  }

  try {
    const token = cookies().get(COOKIE_NAME)?.value;

    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/entity/${type}/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to delete ${type}`);
    }

    const data = await response.json();

    // Revalidate relevant paths based on entity type
    if (type === 'user') {
      revalidatePath('/users');
      revalidatePath(`/users/${id}`);
    } else if (type === 'client') {
      revalidatePath('/clients');
      revalidatePath(`/clients/${id}`);
    }

    return data;
  } catch (error) {
    console.error(`Error deleting ${type}:`, error);
    throw error;
  }
};

/**
 * Get entity profile by type and ID
 * @param type The entity type ('user' or 'client')
 * @param id The ID of the entity
 * @returns A Promise resolving to the entity profile data
 */
export const getEntityProfile = async (type: EntityType, id: string) => {
  if (!type || !id) {
    throw new Error('Entity type and ID are required');
  }

  // Validate entity type
  if (type !== 'user' && type !== 'client') {
    throw new Error('Invalid entity type. Must be "user" or "client"');
  }

  try {
    const token = cookies().get(COOKIE_NAME)?.value;

    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/entity/${type}/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to get ${type} profile`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error getting ${type} profile:`, error);
    throw error;
  }
};

/**
 * Delete current user's own profile
 * This handles logout and redirects after deletion
 */
export const deleteOwnProfile = async (type: EntityType, id: string) => {
  try {
    // Delete the profile
    await deleteEntity(type, id);

    // Clear authentication cookie
    cookies().delete(COOKIE_NAME);

    // Revalidate home/login pages
    revalidatePath('/');
    revalidatePath('/signin');

    // Redirect to login page with message
    redirect('/signin?deleted=true');
  } catch (error) {
    console.error('Error deleting own profile:', error);
    throw error;
  }
};
