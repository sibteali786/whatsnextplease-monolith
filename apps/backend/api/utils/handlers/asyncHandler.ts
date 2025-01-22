import { Request, Response, NextFunction } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler = (handler: AsyncRouteHandler) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error); // This ensures error is passed to error middleware
    }
  };
};
