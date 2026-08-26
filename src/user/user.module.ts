import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthService } from '../common/auth/auth.service';
import { JwtStrategy } from '../common/auth/jwt.strategy';
import { PrismaService } from '../common/prisma.service';
import { ValidationService } from '../common/validation.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    AuthService,
    JwtStrategy,
    PrismaService,
    ValidationService,
  ],
  exports: [UserService, AuthService],
})
export class UserModule {}
