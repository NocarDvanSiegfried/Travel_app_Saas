import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserRepository } from '../../infrastructure/repositories/UserRepository';
import bcrypt from 'bcrypt';

export interface ILoginUserRequest {
  email: string;
  password: string;
}

export interface ILoginUserResponse {
  id: string;
  email: string;
}

export class LoginUserUseCase {
  private userRepository: IUserRepository;

  constructor(userRepository?: IUserRepository) {
    this.userRepository = userRepository || new UserRepository();
  }

  async execute(request: ILoginUserRequest): Promise<ILoginUserResponse> {
    // Find user by email
    const user = await this.userRepository.findByEmail(request.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(request.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    return {
      id: user.id,
      email: user.email,
    };
  }
}

