import { Request, Response, NextFunction } from 'express';
import { B2BUser, B2BUserRole } from '../../domain/entities/B2BUser';
import { IB2BCompanyService } from '../../application/services/B2BCompanyService';

// Extend B2BUserRole to accept string values for compatibility
type ExtendedB2BUserRole = B2BUserRole | string;

interface AuthenticatedRequest extends Request {
  user?: B2BUser;
  company?: {
    id: string;
    name: string;
    subscriptionType: string;
  };
}

export class B2BAuthMiddleware {
  constructor(private readonly companyService: IB2BCompanyService) {}

  authenticate() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            error: 'Токен отсутствует или имеет неверный формат',
            code: 'MISSING_TOKEN'
          });
        }

        const token = authHeader.substring(7);

        // Валидация JWT токена
        const payload = await this.validateJWTToken(token);
        if (!payload) {
          return res.status(401).json({
            error: 'Недействительный токен',
            code: 'INVALID_TOKEN'
          });
        }

        // Получение пользователя и компании
        const user = await this.getUserById(payload.userId);
        if (!user || !user.companyId) {
          return res.status(401).json({
            error: 'Пользователь не найден',
            code: 'USER_NOT_FOUND'
          });
        }

        const company = await this.companyService.getCompanyById(user.companyId);
        if (!company || !company.isActive) {
          return res.status(403).json({
            error: 'Компания не активна',
            code: 'COMPANY_INACTIVE'
          });
        }

        // Добавление данных в запрос
        req.user = user;
        req.company = {
          id: company.id,
          name: company.name,
          subscriptionType: company.subscriptionType
        };

        next();
      } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({
          error: 'Ошибка аутентификации',
          code: 'AUTH_ERROR'
        });
      }
    };
  }

  authorize(requiredRoles: ExtendedB2BUserRole[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Пользователь не аутентифицирован',
          code: 'NOT_AUTHENTICATED'
        });
      }

      if (!this.hasRequiredRole(req.user.role, requiredRoles)) {
        return res.status(403).json({
          error: 'Недостаточно прав доступа',
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredRoles,
          currentRole: req.user.role
        });
      }

      next();
    };
  }

  requireCompanyAccess(allowedCompanyIds?: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user || !req.user.companyId) {
        return res.status(401).json({
          error: 'Доступ только для компаний',
          code: 'COMPANY_ACCESS_REQUIRED'
        });
      }

      if (allowedCompanyIds && !allowedCompanyIds.includes(req.user.companyId)) {
        return res.status(403).json({
          error: 'Доступ к компании запрещен',
          code: 'COMPANY_ACCESS_DENIED'
        });
      }

      next();
    };
  }

  canManageEmployees() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user || !req.user.canManageEmployees()) {
        return res.status(403).json({
          error: 'Недостаточно прав для управления сотрудниками',
          code: 'CANNOT_MANAGE_EMPLOYEES'
        });
      }

      next();
    };
  }

  canApproveExpenses() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user || !req.user.canApproveExpenses()) {
        return res.status(403).json({
          error: 'Недостаточно прав для утверждения расходов',
          code: 'CANNOT_APPROVE_EXPENSES'
        });
      }

      next();
    };
  }

  requireSubscription(feature: string) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.company) {
        return res.status(401).json({
          error: 'Информация о компании отсутствует',
          code: 'COMPANY_INFO_MISSING'
        });
      }

      // Здесь можно добавить проверку подписки
      // const subscription = await this.getSubscription(req.company.id);
      // if (!subscription.hasFeature(feature)) {
      //   return res.status(403).json({
      //     error: `Функция "${feature}" недоступна в вашем тарифе`,
      //     code: 'FEATURE_NOT_AVAILABLE'
      //   });
      // }

      next();
    };
  }

  private async validateJWTToken(token: string): Promise<any> {
    // Здесь будет реальная валидация JWT токена
    // Сейчас просто mock implementation
    try {
      // В реальном приложении здесь будет проверка с помощью jwt.verify
      return {
        userId: 'user_123',
        companyId: 'company_123',
        role: 'company_admin'
      };
    } catch (error) {
      return null;
    }
  }

  private async getUserById(userId: string): Promise<B2BUser | null> {
    // Здесь будет реальное получение пользователя из базы
    // Сейчас просто mock implementation
    return B2BUser.create({
      id: userId,
      email: 'admin@company.com',
      passwordHash: 'hash',
      fullName: 'Admin User',
      companyId: 'company_123',
      role: 'company_admin'
    });
  }

  private hasRequiredRole(userRole: ExtendedB2BUserRole, requiredRoles: ExtendedB2BUserRole[]): boolean {
    // Супер-админ имеет доступ ко всему
    if (userRole === 'super_admin') {
      return true;
    }

    // Иерархия ролей
    const roleHierarchy: Record<ExtendedB2BUserRole, number> = {
      'super_admin': 100,
      'company_admin': 80,
      'department_manager': 60,
      'captain': 40,
      'employee': 20,
      // Добавляем совместимость с строчными ролями из routes
      'admin': 90,
      'manager': 70,
      'booking_agent': 50,
      'accountant': 60
    };

    const userLevel = roleHierarchy[userRole] || 0;

    // Проверяем, есть ли у пользователя хотя бы одна из требуемых ролей
    // или роль с более высоким уровнем доступа
    return requiredRoles.some(requiredRole => {
      const requiredLevel = roleHierarchy[requiredRole] || 0;
      return userLevel >= requiredLevel;
    });
  }
}

// Упрощенные функции для обратной совместимости
let b2bAuthMiddleware: B2BAuthMiddleware | null = null;

export const validateB2BAuth = () => {
  if (!b2bAuthMiddleware) {
    const mockService = {
      getCompanyById: async () => ({
        id: 'company_123',
        name: 'Test Company',
        subscriptionType: 'premium',
        isActive: true
      })
    };
    b2bAuthMiddleware = new B2BAuthMiddleware(mockService as any);
  }
  return b2bAuthMiddleware.authenticate();
};

export const validateB2BRole = (requiredRoles: ExtendedB2BUserRole[]) => {
  if (!b2bAuthMiddleware) {
    const mockService = {
      getCompanyById: async () => ({
        id: 'company_123',
        name: 'Test Company',
        subscriptionType: 'premium',
        isActive: true
      })
    };
    b2bAuthMiddleware = new B2BAuthMiddleware(mockService as any);
  }
  return b2bAuthMiddleware.authorize(requiredRoles);
};

// Additional exports for compatibility
export const b2bAuthMiddleware = validateB2BAuth();

export const requireB2BRole = (roles: ExtendedB2BUserRole[]) => {
  return validateB2BRole(roles);
};