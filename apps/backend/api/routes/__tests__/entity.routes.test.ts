/* eslint-disable @typescript-eslint/no-explicit-any */
import { Express } from 'express';
import { createServer } from '../../server';
import { Roles } from '@prisma/client';
import { prismaMock } from '../../test/mockPrisma';
import { testRequest } from '../../test/testUtils';
import jwt from 'jsonwebtoken';
import { checkIfUserExists, checkIfClientExists } from '../../utils/helperHandlers';

jest.mock('../../utils/helperHandlers');

// Type the mocked functions
const mockedCheckIfUserExists = jest.mocked(checkIfUserExists);
const mockedCheckIfClientExists = jest.mocked(checkIfClientExists);

describe('Entity Routes', () => {
  let app: Express;
  let superUserToken: string;
  let taskSupervisorToken: string;
  let taskAgentToken: string;
  const mockUserId = 'user123';
  const mockClientId = 'client123';

  beforeAll(async () => {
    app = await createServer();

    // Create tokens with different roles
    superUserToken = jwt.sign(
      { id: 'admin', role: Roles.SUPER_USER },
      process.env.SECRET || 'test-secret'
    );

    taskSupervisorToken = jwt.sign(
      { id: 'supervisor', role: Roles.TASK_SUPERVISOR },
      process.env.SECRET || 'test-secret'
    );

    taskAgentToken = jwt.sign(
      { id: 'agent', role: Roles.TASK_AGENT },
      process.env.SECRET || 'test-secret'
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DELETE /entity/:type/:id', () => {
    it('should delete a user when authenticated as SUPER_USER', async () => {
      // Mock dependencies
      mockedCheckIfUserExists.mockResolvedValue();
      prismaMock.user.delete.mockResolvedValue({ id: mockUserId } as any);

      // Make request
      const response = await testRequest(app)
        .delete(`/entity/user/${mockUserId}`)
        .set('Authorization', `Bearer ${superUserToken}`)
        .expect(200);

      // Verify response
      expect(response.body).toEqual({
        success: true,
        message: 'User deleted successfully',
      });
      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: mockUserId },
      });
    });

    it('should delete a client when authenticated as SUPER_USER', async () => {
      // Mock dependencies
      mockedCheckIfClientExists.mockResolvedValue();
      prismaMock.client.delete.mockResolvedValue({ id: mockClientId } as any);

      // Make request
      const response = await testRequest(app)
        .delete(`/entity/client/${mockClientId}`)
        .set('Authorization', `Bearer ${superUserToken}`)
        .expect(200);

      // Verify response
      expect(response.body).toEqual({
        success: true,
        message: 'Client deleted successfully',
      });
      expect(prismaMock.client.delete).toHaveBeenCalledWith({
        where: { id: mockClientId },
      });
    });

    it('should delete an entity when authenticated as TASK_SUPERVISOR', async () => {
      // Mock dependencies
      mockedCheckIfUserExists.mockResolvedValue();
      prismaMock.user.delete.mockResolvedValue({ id: mockUserId } as any);

      // Make request
      const response = await testRequest(app)
        .delete(`/entity/user/${mockUserId}`)
        .set('Authorization', `Bearer ${taskSupervisorToken}`)
        .expect(200);

      // Verify response
      expect(response.body).toEqual({
        success: true,
        message: 'User deleted successfully',
      });
    });

    it('should reject deletion when authenticated with insufficient role', async () => {
      // Make request with Task Agent role
      const response = await testRequest(app)
        .delete(`/entity/user/${mockUserId}`)
        .set('Authorization', `Bearer ${taskAgentToken}`)
        .expect(403);

      // Verify the prisma delete was never called
      expect(prismaMock.user.delete).not.toHaveBeenCalled();
      expect(response.body).toEqual(
        expect.objectContaining({
          message: 'Insufficient permissions',
        })
      );
    });

    it('should reject with invalid entity type', async () => {
      // Make request with invalid entity type
      const response = await testRequest(app)
        .delete(`/entity/invalid/${mockUserId}`)
        .set('Authorization', `Bearer ${superUserToken}`)
        .expect(400);

      // Verify error message
      expect(response.body).toEqual(
        expect.objectContaining({
          message: 'Invalid entity type. Must be "user" or "client"',
        })
      );
    });

    it('should reject deletion when not authenticated', async () => {
      // Make request without auth token
      await testRequest(app).delete(`/entity/user/${mockUserId}`).expect(401);

      // Verify the prisma delete was never called
      expect(prismaMock.user.delete).not.toHaveBeenCalled();
    });
  });

  describe('GET /entity/:type/:id', () => {
    it('should get user profile when authenticated', async () => {
      // Mock dependencies
      const userProfile = { id: mockUserId, name: 'Test User' };
      mockedCheckIfUserExists.mockResolvedValue();
      prismaMock.user.findUnique.mockResolvedValue(userProfile as any);

      // Make request
      const response = await testRequest(app)
        .get(`/entity/user/${mockUserId}`)
        .set('Authorization', `Bearer ${taskAgentToken}`)
        .expect(200);

      // Verify response
      expect(response.body).toEqual(userProfile);
    });

    it('should get client profile when authenticated', async () => {
      // Mock dependencies
      const clientProfile = { id: mockClientId, name: 'Test Client' };
      mockedCheckIfClientExists.mockResolvedValue();
      prismaMock.client.findUnique.mockResolvedValue(clientProfile as any);

      // Make request
      const response = await testRequest(app)
        .get(`/entity/client/${mockClientId}`)
        .set('Authorization', `Bearer ${taskAgentToken}`)
        .expect(200);

      // Verify response
      expect(response.body).toEqual(clientProfile);
    });

    it('should reject with invalid entity type', async () => {
      // Make request with invalid entity type
      const response = await testRequest(app)
        .get(`/entity/invalid/${mockUserId}`)
        .set('Authorization', `Bearer ${taskAgentToken}`)
        .expect(400);

      // Verify error message
      expect(response.body).toEqual(
        expect.objectContaining({
          message: 'Invalid entity type. Must be "user" or "client"',
        })
      );
    });
  });
});
