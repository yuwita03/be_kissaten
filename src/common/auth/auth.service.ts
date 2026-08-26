import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { Role } from '../roles.enum';

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async generateToken(user: {
    id: number;
    email: string;
    role: Role;
  }): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.signAsync(payload);
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<{ id: number; email: string; role: Role } | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return null;
    }
    const isValid = await this.comparePassword(password, user.password);
    if (!isValid) {
      return null;
    }
    return { id: user.id, email: user.email, role: user.role };
  }
}
