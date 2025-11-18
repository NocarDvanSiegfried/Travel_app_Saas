import { Request, Response } from 'express';
import { RegisterUserUseCase } from '../../application/auth/RegisterUserUseCase';
import { LoginUserUseCase } from '../../application/auth/LoginUserUseCase';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ message: 'Email and password are required' });
        return;
      }

      const useCase = new RegisterUserUseCase();
      const result = await useCase.execute({ email, password });

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Registration failed' });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ message: 'Email and password are required' });
        return;
      }

      const useCase = new LoginUserUseCase();
      const result = await useCase.execute({ email, password });

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Login failed' });
    }
  }
}

