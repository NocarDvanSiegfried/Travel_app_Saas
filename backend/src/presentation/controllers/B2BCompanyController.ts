import { Request, Response } from 'express';
import { IB2BCompanyService, CreateCompanyDto, UpdateCompanyDto, AddEmployeeDto } from '../../application/services/B2BCompanyService';
import { B2BUserRole } from '../../domain/entities/B2BUser';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: B2BUserRole;
    companyId?: string;
  };
  company?: {
    id: string;
    name: string;
    subscriptionType: string;
  };
}

export class B2BCompanyController {
  constructor(private readonly companyService: IB2BCompanyService) {}

  async createCompany(req: Request, res: Response) {
    try {
      const companyData: CreateCompanyDto = req.body;

      // Валидация данных
      const validationResult = await this.validateCreateCompanyData(companyData);
      if (!validationResult.isValid) {
        return res.status(400).json({
          error: 'Ошибка валидации данных',
          details: validationResult.errors
        });
      }

      const company = await this.companyService.createCompany(companyData);

      return res.status(201).json({
        success: true,
        data: {
          company: {
            id: company.id,
            name: company.name,
            industry: company.industry,
            size: company.size,
            subscriptionType: company.subscriptionType,
            isActive: company.isActive,
            createdAt: company.createdAt
          }
        },
        message: 'Компания успешно создана'
      });
    } catch (error) {
      console.error('Create company error:', error);
      return res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async getCompany(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req.params;

      // Проверка прав доступа
      if (req.user?.companyId !== companyId && req.user?.role !== 'super_admin') {
        return res.status(403).json({
          error: 'Доступ запрещен',
          code: 'ACCESS_DENIED'
        });
      }

      const company = await this.companyService.getCompanyById(companyId);
      if (!company) {
        return res.status(404).json({
          error: 'Компания не найдена',
          code: 'COMPANY_NOT_FOUND'
        });
      }

      return res.json({
        success: true,
        data: {
          company: {
            id: company.id,
            name: company.name,
            legalDetails: company.legalDetails,
            industry: company.industry,
            size: company.size,
            subscriptionType: company.subscriptionType,
            isActive: company.isActive,
            createdAt: company.createdAt,
            updatedAt: company.updatedAt
          }
        }
      });
    } catch (error) {
      console.error('Get company error:', error);
      return res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async updateCompany(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req.params;
      const updateData: UpdateCompanyDto = req.body;

      // Проверка прав доступа
      if (!req.user?.canManageCompany?.() && req.user?.role !== 'super_admin') {
        return res.status(403).json({
          error: 'Недостаточно прав для редактирования компании',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      if (req.user?.companyId !== companyId && req.user?.role !== 'super_admin') {
        return res.status(403).json({
          error: 'Доступ запрещен',
          code: 'ACCESS_DENIED'
        });
      }

      const company = await this.companyService.updateCompany(companyId, updateData);

      return res.json({
        success: true,
        data: {
          company: {
            id: company.id,
            name: company.name,
            legalDetails: company.legalDetails,
            industry: company.industry,
            size: company.size,
            subscriptionType: company.subscriptionType,
            isActive: company.isActive,
            updatedAt: company.updatedAt
          }
        },
        message: 'Данные компании успешно обновлены'
      });
    } catch (error) {
      console.error('Update company error:', error);
      return res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async getCompanyEmployees(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req.params;

      // Проверка прав доступа
      if (!req.user?.canManageEmployees?.() && req.user?.companyId !== companyId) {
        return res.status(403).json({
          error: 'Недостаточно прав для просмотра сотрудников',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      const employees = await this.companyService.getCompanyEmployees(companyId);

      return res.json({
        success: true,
        data: {
          employees: employees.map(employee => ({
            id: employee.id,
            email: employee.email,
            fullName: employee.fullName,
            phone: employee.phone,
            role: employee.role,
            department: employee.department,
            position: employee.position,
            managerId: employee.managerId,
            isActive: true, // TODO: добавить isActive в B2BUser
            createdAt: employee.createdAt,
            lastLoginAt: employee.lastLoginAt
          })),
          total: employees.length
        }
      });
    } catch (error) {
      console.error('Get employees error:', error);
      return res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async addEmployee(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req.params;
      const employeeData: AddEmployeeDto = req.body;

      // Проверка прав доступа
      if (!req.user?.canManageEmployees?.()) {
        return res.status(403).json({
          error: 'Недостаточно прав для добавления сотрудников',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      if (req.user?.companyId !== companyId) {
        return res.status(403).json({
          error: 'Доступ запрещен',
          code: 'ACCESS_DENIED'
        });
      }

      // Валидация данных
      const validationResult = await this.validateEmployeeData(employeeData);
      if (!validationResult.isValid) {
        return res.status(400).json({
          error: 'Ошибка валидации данных',
          details: validationResult.errors
        });
      }

      const employee = await this.companyService.addEmployeeToCompany(companyId, employeeData);

      return res.status(201).json({
        success: true,
        data: {
          employee: {
            id: employee.id,
            email: employee.email,
            fullName: employee.fullName,
            phone: employee.phone,
            role: employee.role,
            department: employee.department,
            position: employee.position,
            managerId: employee.managerId,
            createdAt: employee.createdAt
          }
        },
        message: 'Сотрудник успешно добавлен'
      });
    } catch (error) {
      console.error('Add employee error:', error);
      return res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async removeEmployee(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId, employeeId } = req.params;

      // Проверка прав доступа
      if (!req.user?.canManageEmployees?.()) {
        return res.status(403).json({
          error: 'Недостаточно прав для удаления сотрудников',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      if (req.user?.companyId !== companyId) {
        return res.status(403).json({
          error: 'Доступ запрещен',
          code: 'ACCESS_DENIED'
        });
      }

      // Нельзя удалить самого себя
      if (req.user?.id === employeeId) {
        return res.status(400).json({
          error: 'Нельзя удалить свою учетную запись',
          code: 'CANNOT_DELETE_SELF'
        });
      }

      await this.companyService.removeEmployeeFromCompany(companyId, employeeId);

      return res.json({
        success: true,
        message: 'Сотрудник успешно удален'
      });
    } catch (error) {
      console.error('Remove employee error:', error);
      return res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async updateEmployeeRole(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId, employeeId } = req.params;
      const { role } = req.body;

      // Проверка прав доступа
      if (!req.user?.canManageEmployees?.()) {
        return res.status(403).json({
          error: 'Недостаточно прав для изменения роли',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      if (req.user?.companyId !== companyId) {
        return res.status(403).json({
          error: 'Доступ запрещен',
          code: 'ACCESS_DENIED'
        });
      }

      // Валидация роли
      if (!Object.values(['super_admin', 'company_admin', 'department_manager', 'employee', 'captain']).includes(role)) {
        return res.status(400).json({
          error: 'Недопустимая роль',
          code: 'INVALID_ROLE'
        });
      }

      const employee = await this.companyService.updateEmployeeRole(employeeId, role);

      return res.json({
        success: true,
        data: {
          employee: {
            id: employee.id,
            role: employee.role
          }
        },
        message: 'Роль сотрудника успешно обновлена'
      });
    } catch (error) {
      console.error('Update employee role error:', error);
      return res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  private async validateCreateCompanyData(data: CreateCompanyDto): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length < 2) {
      errors.push('Название компании должно содержать минимум 2 символа');
    }

    if (!data.legalDetails?.inn || data.legalDetails.inn.length !== 10) {
      errors.push('ИНН должен содержать 10 цифр');
    }

    if (!data.legalDetails?.ogrn || data.legalDetails.ogrn.length !== 13) {
      errors.push('ОГРН должен содержать 13 цифр');
    }

    if (!data.industry) {
      errors.push('Отрасль обязательна для заполнения');
    }

    if (!data.adminUser?.email) {
      errors.push('Email администратора обязателен');
    }

    if (!data.adminUser?.password || data.adminUser.password.length < 8) {
      errors.push('Пароль должен содержать минимум 8 символов');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async validateEmployeeData(data: AddEmployeeDto): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!data.email) {
      errors.push('Email обязателен');
    }

    if (!data.fullName || data.fullName.trim().length < 2) {
      errors.push('ФИО должно содержать минимум 2 символа');
    }

    if (!data.role) {
      errors.push('Роль обязательна для заполнения');
    }

    if (data.password && data.password.length < 8) {
      errors.push('Пароль должен содержать минимум 8 символов');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}