import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    phone?: string;
    avatarUrl?: string;
  };
  token: string;
  expiresIn: string;
}

export interface CreateUserData {
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string;
}

/**
 * Authentication Service
 *
 * Handles user registration, login, and JWT token management
 */
export class AuthService {
  constructor(
    private userRepository: IUserRepository,
    private jwtSecret: string = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production',
    private jwtExpiresIn: string = process.env.JWT_EXPIRES_IN || '24h',
    private bcryptSaltRounds: number = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10')
  ) {}

  /**
   * Register a new user
   */
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, this.bcryptSaltRounds);

    // Create user data
    const createUserData: CreateUserData = {
      email: userData.email,
      passwordHash,
      fullName: userData.fullName,
      phone: userData.phone
    };

    // Create user
    const user = await this.userRepository.create(createUserData);

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatarUrl: user.avatarUrl
      },
      token,
      expiresIn: this.jwtExpiresIn
    };
  }

  /**
   * Login user
   */
  async login(loginData: LoginRequest): Promise<AuthResponse> {
    // Find user by email
    const user = await this.userRepository.findByEmail(loginData.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(loginData.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    // Note: You might want to implement this in the repository
    // await this.userRepository.updateLastLogin(user.id);

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatarUrl: user.avatarUrl
      },
      token,
      expiresIn: this.jwtExpiresIn
    };
  }

  /**
   * Verify JWT token and return user
   */
  async verifyToken(token: string): Promise<User> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as {
        id: string;
        email: string;
        fullName: string;
      };

      const user = await this.userRepository.findById(decoded.id);
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Generate JWT token for user
   */
  private generateToken(user: User): string {
    const payload = {
      id: user.id,
      email: user.email,
      fullName: user.fullName
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      subject: user.id,
      issuer: 'travel-app-backend'
    });
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(token: string): Promise<AuthResponse> {
    try {
      // Verify current token (even if expired, we can extract user info)
      const decoded = jwt.decode(token) as {
        id: string;
        email: string;
        fullName: string;
      };

      if (!decoded) {
        throw new Error('Invalid token');
      }

      // Get fresh user data
      const user = await this.userRepository.findById(decoded.id);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new token
      const newToken = this.generateToken(user);

      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          avatarUrl: user.avatarUrl
        },
        token: newToken,
        expiresIn: this.jwtExpiresIn
      };
    } catch (error) {
      throw new Error('Unable to refresh token');
    }
  }
}