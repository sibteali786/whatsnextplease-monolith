import { asyncHandler } from '../utils/handlers/asyncHandler';
import { AuthenticatedRequest } from './../middleware/auth/types';
import { SkillCategoryService } from '../services/skillcategory.service';
import { NextFunction, Response } from 'express';
import { SkillCategoryCreateSchema, SkillCategoryEditSchema } from '@wnp/types';

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
      res.status(200).json(skillCategories);
    } catch (error) {
      next(error);
    }
  };
  private handleCreateSkillCategory = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    const { categoryName } = req.body;
    try {
      const parsedInput = SkillCategoryCreateSchema.parse({ categoryName });
      const newSkillCategory = await this.skillCategoryService.createSkillCategory({
        categoryName: parsedInput.categoryName,
      });
      res.status(201).json(newSkillCategory);
    } catch (error) {
      next(error);
    }
  };
  private handleEditSkillCategory = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    const { categoryName, id } = req.body;
    try {
      const parsedInput = SkillCategoryEditSchema.parse({ categoryName, id });
      const updatedSkillCategory = await this.skillCategoryService.editSkillCategory({
        categoryName: parsedInput.categoryName,
        id: parsedInput.id,
      });
      res.status(200).json(updatedSkillCategory);
    } catch (error) {
      next(error);
    }
  };
  private handleSearchSkillCategories = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { q } = req.query;
      const searchTerm = typeof q === 'string' ? q : '';
      const skillCategories = await this.skillCategoryService.searchSkillCategories(searchTerm);
      res.status(200).json(skillCategories);
    } catch (error) {
      next(error);
    }
  };

  searchSkillCategories = asyncHandler(this.handleSearchSkillCategories);
  getAllSkillCategories = asyncHandler(this.handleGetAllSkillCategories);
  createSkillCategory = asyncHandler(this.handleCreateSkillCategory);
  editSkillCategory = asyncHandler(this.handleEditSkillCategory);
}
