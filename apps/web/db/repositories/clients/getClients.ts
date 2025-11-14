import prisma from '@/db/db';
import { handleError } from '@/utils/errorHandler';
import logger from '@/utils/logger';
import {
  ClientsListResponse,
  ClientsListResponseSchema,
  GetClientsListParamsSchema,
} from '@/utils/validationSchemas';
import { Prisma } from '@prisma/client';
import 'server-only';

interface GetClientsListParams {
  cursor: string | null; // Cursor to start fetching the next set of records
  pageSize?: number; // Number of records to fetch
  search?: string; // Optional search query
}

const getClientsList = async ({
  cursor,
  pageSize = 10,
  search = '',
}: GetClientsListParams): Promise<ClientsListResponse> => {
  try {
    // Validate input parameters
    GetClientsListParamsSchema.parse({ cursor, pageSize });

    // Build base where clause for search
    const whereClause =
      search.trim() !== ''
        ? {
            OR: [
              { contactName: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
              { companyName: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
            ],
          }
        : {};
    // Fetch total count of clients
    const totalCount = await prisma.client.count({
      where: whereClause,
    });

    // Fetch clients
    const clients = await prisma.client.findMany({
      where: whereClause,
      take: pageSize + 1, // Fetch one extra to check for next page
      ...(cursor && { cursor: { id: cursor }, skip: 1 }), // Skip cursor if provided
      select: {
        id: true,
        username: true,
        companyName: true,
        contactName: true,
        email: true,
        phone: true,
        website: true,
        address1: true,
        address2: true,
        city: true,
        state: true,
        zipCode: true,
        avatarUrl: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    // Determine if there is a next page
    const hasNextPage = clients.length > pageSize;

    // Remove the extra client if we have more than the page size
    if (hasNextPage) {
      clients.pop();
    }

    // Get the next cursor
    const nextCursor = hasNextPage ? clients[clients?.length - 1]?.id : null;

    // Prepare the response data
    const responseData = {
      success: true,
      clients,
      nextCursor,
      hasNextPage,
      totalCount,
    };

    // Validate the response data against the schema
    return ClientsListResponseSchema.parse(responseData);
  } catch (error) {
    logger.error({ error }, 'Error in getClientsList');
    return handleError(error, 'getClientsList') as ClientsListResponse;
  }
};

export default getClientsList;
