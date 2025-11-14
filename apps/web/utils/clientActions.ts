'use server';
import prisma from '@/db/db';
import getClientsList from '@/db/repositories/clients/getClients';

interface ClientById {
  client: ClientDetailsCardProps | null;
  message?: string;
}
export interface ClientDetailsCardProps {
  companyName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  address1: string | null;
  address2?: string | null;
  avatarUrl: string | null;
}

export const getClientById = async (clientId: string): Promise<ClientById> => {
  if (!clientId) {
    return { client: null, message: 'Invalid client id' };
  }
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        contactName: true,
        companyName: true,
        zipCode: true,
        address1: true,
        address2: true,
        phone: true,
        email: true,
        city: true,
        state: true,
        avatarUrl: true,
      },
    });

    if (!client) {
      return { client: null, message: 'Client not found' };
    }

    return { client, message: 'Successfully retrieved client' };
  } catch (e) {
    console.log(e);
    throw new Error('Failed to retrieve client');
  }
};

export const getAllClientIds = async () => {
  try {
    // Fetch all client IDs with consistent ordering
    const clientIds = await prisma.client.findMany({
      select: {
        id: true,
      },
      orderBy: {
        id: 'asc', // Ensure the same ordering as `getClientsList`
      },
    });
    return clientIds.map(client => client.id); // Return only the list of IDs
  } catch (error) {
    console.error('Error in getAllClientIds:', error);
    throw new Error('Failed to retrieve client IDs.');
  }
};

export const getTaskIdsByClientId = async (clientId: string) => {
  try {
    if (typeof clientId !== 'string' || clientId.trim().length === 0) {
      return {
        success: false,
        taskIds: null,
      };
    }
    const taskIds = await prisma.task.findMany({
      where: {
        createdByClientId: clientId,
      },
      orderBy: { id: 'asc' },
      select: {
        id: true,
      },
    });
    return {
      taskIds: taskIds.map(task => task.id),
      success: true,
    };
  } catch (e) {
    console.error(e);
    throw new Error('Failed to retrieve tasks by client id');
  }
};

export const getBillingIdsByClientId = async (clientId: string) => {
  try {
    if (typeof clientId !== 'string' || clientId.trim().length === 0) {
      return {
        message: 'Invalid client ID provided.',
        billingIds: null,
      };
    }
    const billing = await prisma.invoice.findMany({
      where: { clientId },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    return {
      billingIds: billing.map(billing => billing.id),
      message: 'successfully retrieved ids ',
    };
  } catch (e) {
    console.error(e);
    throw new Error('Failed to retrieve tasks by client id');
  }
};

export const getFileIdsByClientId = async (clientId: string) => {
  try {
    if (typeof clientId !== 'string' || clientId.trim().length === 0) {
      return {
        message: 'Invalid client ID provided.',
        billingIds: null,
      };
    }
    const files = await prisma.file.findMany({
      where: { ownerClientId: clientId },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    return {
      fileIds: files.map(file => file.id),
      message: 'successfully retrieved ids ',
    };
  } catch (e) {
    console.error(e);
    throw new Error('Failed to retrieve file ids by given client id');
  }
};
export const fetchClients = async (cursor: string | null, pageSize: number, search?: string) => {
  'use server';

  const { clients, nextCursor, totalCount, hasNextPage } = await getClientsList({
    cursor: cursor,
    pageSize: pageSize, // Change page size as required
    search,
  });
  return { clients, nextCursor, totalCount, hasNextPage };
};
