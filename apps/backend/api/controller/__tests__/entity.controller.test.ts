import { Request, Response } from 'express';
import { EntityController } from '../../controller/entity.controller';
import { UserService } from '../../services/user.service';
import { ClientService } from '../../services/client.service';
import { checkIfUserExists, checkIfClientExists } from '../../utils/helperHandlers';
import { NotFoundError, BadRequestError } from '@wnp/types';

// Mock the helperHandlers
jest.mock('../../utils/helperHandlers');

describe('EntityController', () => {
  let controller: EntityController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockUserService: jest.Mocked<UserService>;
  let mockClientService: jest.Mocked<ClientService>;
  let mockNext: jest.Mock;

  // Mock helper functions
  const mockedCheckIfUserExists = jest.mocked(checkIfUserExists);
  const mockedCheckIfClientExists = jest.mocked(checkIfClientExists);

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup request and response mocks
    mockRequest = {
      params: {},
      body: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Initialize service mocks
    mockUserService = new UserService() as jest.Mocked<UserService>;
    mockClientService = new ClientService() as jest.Mocked<ClientService>;

    // Create controller instance with mocked services
    controller = new EntityController(mockUserService, mockClientService);
  });

  describe('deleteEntity', () => {
    it('should delete a user successfully', async () => {
      // Setup mocks
      mockRequest.params = { id: 'user123', type: 'user' };
      mockedCheckIfUserExists.mockResolvedValue();
      mockUserService.deleteUser = jest.fn().mockResolvedValue({ id: 'user123' });

      // Call the function
      await controller.deleteEntity(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify results
      expect(mockedCheckIfUserExists).toHaveBeenCalledWith('user123');
      expect(mockUserService.deleteUser).toHaveBeenCalledWith('user123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User deleted successfully',
      });
    });

    it('should delete a client successfully', async () => {
      // Setup mocks
      mockRequest.params = { id: 'client123', type: 'client' };
      mockedCheckIfClientExists.mockResolvedValue();
      mockClientService.deleteClient = jest.fn().mockResolvedValue({ id: 'client123' });

      // Call the function
      await controller.deleteEntity(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify results
      expect(mockedCheckIfClientExists).toHaveBeenCalledWith('client123');
      expect(mockClientService.deleteClient).toHaveBeenCalledWith('client123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Client deleted successfully',
      });
    });

    it('should handle invalid entity type', async () => {
      // Setup with invalid entity type
      mockRequest.params = { id: 'entity123', type: 'invalid' };

      // Call the function
      await controller.deleteEntity(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify error handling
      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe('Invalid entity type. Must be "user" or "client"');
    });

    it('should handle missing entity ID', async () => {
      // Setup with missing ID
      mockRequest.params = { type: 'user' };

      // Call the function
      await controller.deleteEntity(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify error handling
      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe('Entity ID is required');
    });

    it('should handle non-existent user', async () => {
      // Setup with user that doesn't exist
      mockRequest.params = { id: 'nonexistent', type: 'user' };
      const notFoundError = new NotFoundError('User', { userId: 'nonexistent' });
      mockedCheckIfUserExists.mockRejectedValue(notFoundError);

      // Call the function
      await controller.deleteEntity(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify error handling
      expect(mockNext).toHaveBeenCalledWith(notFoundError);
    });

    it('should handle service errors', async () => {
      // Setup with service error
      mockRequest.params = { id: 'user123', type: 'user' };
      mockedCheckIfUserExists.mockResolvedValue();
      const serviceError = new Error('Database error');
      mockUserService.deleteUser = jest.fn().mockRejectedValue(serviceError);

      // Call the function
      await controller.deleteEntity(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify error handling
      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('getEntityProfile', () => {
    it('should get user profile successfully', async () => {
      // Setup mocks
      const userProfile = { id: 'user123', name: 'Test User' };
      mockRequest.params = { id: 'user123', type: 'user' };
      mockedCheckIfUserExists.mockResolvedValue();
      mockUserService.getUserProfile = jest.fn().mockResolvedValue(userProfile);

      // Call the function
      await controller.getEntityProfile(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify results
      expect(mockedCheckIfUserExists).toHaveBeenCalledWith('user123');
      expect(mockUserService.getUserProfile).toHaveBeenCalledWith('user123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(userProfile);
    });

    it('should get client profile successfully', async () => {
      // Setup mocks
      const clientProfile = { id: 'client123', name: 'Test Client' };
      mockRequest.params = { id: 'client123', type: 'client' };
      mockedCheckIfClientExists.mockResolvedValue();
      mockClientService.getClientProfile = jest.fn().mockResolvedValue(clientProfile);

      // Call the function
      await controller.getEntityProfile(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify results
      expect(mockedCheckIfClientExists).toHaveBeenCalledWith('client123');
      expect(mockClientService.getClientProfile).toHaveBeenCalledWith('client123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(clientProfile);
    });

    it('should handle non-existent profile', async () => {
      // Setup for non-existent profile
      mockRequest.params = { id: 'user123', type: 'user' };
      mockedCheckIfUserExists.mockResolvedValue();
      mockUserService.getUserProfile = jest.fn().mockResolvedValue(null);

      // Call the function
      await controller.getEntityProfile(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify error handling
      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(NotFoundError);
    });
  });
});
