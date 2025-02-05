import jwt from 'jsonwebtoken';
import { Express } from 'express';
import { prismaMock } from '../../test/mockPrisma';
import { createServer } from '../../server';
import { Roles } from '@prisma/client';
import { testRequest } from '../../test/testUtils';
import { InternalServerError } from '@wnp/types';
describe('Skill Category routes', () => {
  let app: Express;
  let mockToken: string;
  const mockUserId = 'user123';
  const mockFindMany = prismaMock.skillCategory.findMany as jest.Mock;
  const mockCreate = prismaMock.skillCategory.create as jest.Mock;
  beforeAll(async () => {
    app = await createServer();
    mockToken = jwt.sign(
      { id: mockUserId, role: Roles.TASK_AGENT },
      process.env.SECRET || 'test-secret'
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /all', () => {
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
    it('should return all Skill Categories as array of object', async () => {
      mockFindMany.mockReturnValue(mockSkillCategories);
      const response = await testRequest(app)
        .get('/skillCategory/all')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);
      expect(response.body).toEqual(mockSkillCategories);
    });
    it('should return error object with ErrorResponse type', async () => {
      const error = new InternalServerError('Something is wrong on server');
      mockFindMany.mockRejectedValue(error);
      const response = await testRequest(app)
        .get('/skillCategory/all')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
      expect(response.body).toEqual(expect.objectContaining({ code: 'INTERNAL_SERVER_ERROR' }));
    });
  });
  describe('POST /create', () => {
    const mockSkillCategory = {
      id: '1d98dfd3-7848-44ad-a5bc-08076ee6f7ad',
      categoryName: 'Development',
      updatedAt: new Date().toString(),
      createdAt: new Date().toString(),
    };
    const mockRequest = {
      categoryName: 'Development',
    };
    it('should create new skill category', async () => {
      mockCreate.mockResolvedValue(mockSkillCategory);
      const response = await testRequest(app)
        .post('/skillCategory/create')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(mockRequest)
        .expect(201);
      expect(response.body).toEqual(mockSkillCategory);
    });

    it('should return error object with ErrorResponse type', async () => {
      const error = new InternalServerError('Something is wrong on server');
      mockCreate.mockRejectedValue(error);
      const response = await testRequest(app)
        .post('/skillCategory/create')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(mockRequest);
      expect(response.body).toEqual(expect.objectContaining({ code: 'INTERNAL_SERVER_ERROR' }));
    });
  });
});
