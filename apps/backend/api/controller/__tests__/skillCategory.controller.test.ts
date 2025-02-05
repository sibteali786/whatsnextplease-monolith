import { Request, Response } from 'express';
import { SkillCategoryService } from '../../services/skillcategory.service';
import { SkillCategoryController } from '../skillCategory.controller';
import { InternalServerError } from '@wnp/types';

jest.mock('../../services/skillcategory.service', () => ({
  SkillCategoryService: jest.fn().mockImplementation(() => ({
    getAllSkillCategories: jest.fn(),
    createSkillCategory: jest.fn(),
  })),
}));

describe('getAllSkillCategories', () => {
  let controller: SkillCategoryController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;
  let mockSkillCategoryService: jest.Mocked<SkillCategoryService>;
  beforeAll(() => {
    jest.clearAllMocks();

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

    mockSkillCategoryService = new SkillCategoryService() as jest.Mocked<SkillCategoryService>;

    controller = new SkillCategoryController(mockSkillCategoryService);
  });

  describe('getAllSkillCategory', () => {
    const mockSkillCategories = [
      {
        id: '1d98dfd3-7848-44ad-a5bc-08076ee6f7ad',
        categoryName: 'Development',
        skills: [
          {
            id: 'fcc37184-e4d3-46d4-a5dc-a334f7d3f861',
            name: 'Web Development',
            description: 'Full-stack web development',
          },
          {
            id: 'd369cd4f-bef2-46c1-8c7c-afa353d094e5',
            name: 'Frontend Development',
            description: 'UI/UX and frontend skills',
          },
          {
            id: '249b7be9-15e6-43b3-88bc-37c441ad51e9',
            name: 'Backend Development',
            description: 'Server-side programming',
          },
          {
            id: 'df7ed2d6-c4a2-46bc-a1c8-9554d9f69326',
            name: 'Mobile App Development',
            description: 'Native and hybrid apps',
          },
        ],
      },
    ];
    it('should return all skill categories', async () => {
      mockSkillCategoryService.getAllSkillCategories.mockResolvedValue(mockSkillCategories);

      await controller.getAllSkillCategories(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockSkillCategories);
    });

    it('should return [] when no skill categories available', async () => {
      mockSkillCategoryService.getAllSkillCategories.mockResolvedValue([]);

      await controller.getAllSkillCategories(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith([]);
    });

    it('should throw error there is some problem on server', async () => {
      mockSkillCategoryService.getAllSkillCategories.mockRejectedValue(
        new InternalServerError('Something is wrong on server side')
      );
      await controller.getAllSkillCategories(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(InternalServerError);
    });
  });
  describe('createSkillCategory', () => {
    it('should create a skill category successful', async () => {
      const mockedCreateSkillCategory = {
        id: '1d98dfd3-7848-44ad-a5bc-08076ee6f7ad',
        categoryName: 'Test Category Name',
        updatedAt: new Date(),
        createdAt: new Date(),
      };
      mockRequest.body = mockedCreateSkillCategory;
      mockSkillCategoryService.createSkillCategory.mockResolvedValue(mockedCreateSkillCategory);

      await controller.createSkillCategory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockedCreateSkillCategory);
    });

    it('should throw error there is some problem on server', async () => {
      const mockedCreateSkillCategory = {
        categoryName: 'Test Category Name',
      };
      mockRequest.body = mockedCreateSkillCategory;
      mockSkillCategoryService.createSkillCategory.mockRejectedValue(
        new InternalServerError('Something is wrong on server side')
      );

      await controller.createSkillCategory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(InternalServerError);
    });
  });
});
