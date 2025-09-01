import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { SkillService } from '../services/skill.service';
import { asyncHandler } from '../utils/handlers/asyncHandler';
import { SkillCreateSchema } from '@wnp/types';

export class SkillController {
  constructor(private readonly skillService: SkillService = new SkillService()) {}
  private handleGetSkills = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const skills = await this.skillService.getSkills();
      res.status(200).json(skills);
    } catch (error) {
      next(error);
    }
  };

  private handleCreateSkills = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const skillsFromBody = req.body;
      const parsedInput = SkillCreateSchema.parse(skillsFromBody);
      const skills = await this.skillService.createSkill(parsedInput);
      res.status(200).json({ success: true, skills });
    } catch (error) {
      next(error);
    }
  };

  private handleAssignSkillsToUser = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { skillNames } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
      }

      const result = await this.skillService.assignSkillsToUser(userId, skillNames);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getSkills = asyncHandler(this.handleGetSkills);
  createSkills = asyncHandler(this.handleCreateSkills);
  assignSkillsToUser = asyncHandler(this.handleAssignSkillsToUser);
}
