import { asyncHandler } from '../utils/handlers/asyncHandler';
import { AuthenticatedRequest } from './../middleware/auth/types';
import { SkillCategoryService } from '../services/skillcategory.service';
import { NextFunction, Response } from 'express';

export class SkillCategoryController {
  constructor(
    private readonly skillCategoryService: SkillCategoryService = new SkillCategoryService()
  ) {}
  private handleGetAllSkillCategories = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const skillCategories = await this.skillCategoryService.getAllSkillCategories();
      res.json(skillCategories);
    } catch (error) {
      next(error);
    }
  };

  getAllSkillCategories = asyncHandler(this.handleGetAllSkillCategories);
}
