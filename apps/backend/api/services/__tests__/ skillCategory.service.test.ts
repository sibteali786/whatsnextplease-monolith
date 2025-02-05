import { prismaMock } from '../../test/mockPrisma';
import { SkillCategoryService } from '../skillcategory.service';

describe('Skill Category Service', () => {
  let service: SkillCategoryService;
  const mockFindManySkillCategories = prismaMock.skillCategory.findMany as jest.Mock;
  const mockCreateSkillCategory = prismaMock.skillCategory.create as jest.Mock;
  beforeEach(() => {
    service = new SkillCategoryService();
    jest.clearAllMocks();
  });
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
  describe('getAllSkillCategories', () => {
    it('should return all skill categories', async () => {
      mockFindManySkillCategories.mockResolvedValue(mockSkillCategories);
      const result = await service.getAllSkillCategories();
      expect(result).toEqual(mockSkillCategories);
      expect(mockFindManySkillCategories).toHaveBeenCalledWith({
        select: {
          id: true,
          categoryName: true,
          skills: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        take: 10,
      });
    });

    it('should return [] when no values', async () => {
      mockFindManySkillCategories.mockResolvedValue([]);
      const response = await service.getAllSkillCategories();
      expect(response).toEqual([]);
    });
  });
  describe('createSkillCategory', () => {
    const mockedCreateSkillCategory = {
      categoryName: 'Test Category Name',
    };
    it('should create a skill category successful', async () => {
      mockCreateSkillCategory.mockResolvedValue(mockedCreateSkillCategory);
      const response = await service.createSkillCategory(mockedCreateSkillCategory);
      expect(response).toEqual(mockedCreateSkillCategory);
      expect(mockCreateSkillCategory).toHaveBeenCalledWith({
        data: mockedCreateSkillCategory,
      });
    });
  });
});
