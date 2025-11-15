import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { pool } from '../database/PostgresConnection';

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapToUser(result.rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapToUser(result.rows[0]);
  }

  async create(user: User): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (id, email, password_hash, full_name, phone, avatar_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        user.id,
        user.email,
        user.passwordHash,
        user.fullName,
        user.phone || null,
        user.avatarUrl || null,
        user.createdAt || new Date(),
        user.updatedAt || new Date()
      ]
    );
    
    return this.mapToUser(result.rows[0]);
  }

  async update(user: User): Promise<User> {
    const result = await pool.query(
      `UPDATE users 
       SET email = $2, password_hash = $3, full_name = $4, phone = $5, avatar_url = $6, updated_at = $7
       WHERE id = $1
       RETURNING *`,
      [
        user.id,
        user.email,
        user.passwordHash,
        user.fullName,
        user.phone || null,
        user.avatarUrl || null,
        new Date()
      ]
    );
    
    return this.mapToUser(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  }

  private mapToUser(row: any): User {
    return new User(
      row.id,
      row.email,
      row.password_hash,
      row.full_name,
      row.phone,
      row.avatar_url,
      row.created_at,
      row.updated_at,
      row.last_login_at
    );
  }
}

