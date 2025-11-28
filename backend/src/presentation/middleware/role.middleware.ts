import { Request, Response, NextFunction } from 'express';

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Placeholder role middleware
    const userRole = (req as any).user?.role || 'user';

    if (roles.includes(userRole) || roles.includes('*')) {
      next();
    } else {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
  };
};

export const validateRole = requireRole;