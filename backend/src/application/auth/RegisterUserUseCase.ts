import { User } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserRepository } from '../../infrastructure/repositories/UserRepository';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export interface IRegisterUserRequest {
  email: string;
  password: string;
}

export interface IRegisterUserResponse {
  id: string;
  email: string;
}

export class RegisterUserUseCase {
  private userRepository: IUserRepository;

  constructor(userRepository?: IUserRepository) {
    this.userRepository = userRepository || new UserRepository();
  }

  async execute(request: IRegisterUserRequest): Promise<IRegisterUserResponse> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(request.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(request.password, 10);

    // Create user entity
    // Extract name from email for full_name (required by DB)
    const emailName = request.email.split('@')[0];
    const user = new User(
      uuidv4(),
      request.email,
      passwordHash,
      emailName, // fullName - use email prefix as default
      undefined, // phone
      undefined, // avatarUrl
      new Date(), // createdAt
      new Date(), // updatedAt
      undefined // lastLoginAt
    );

    // Save user
    const createdUser = await this.userRepository.create(user);

    return {
      id: createdUser.id,
      email: createdUser.email,
    };
  }
}

