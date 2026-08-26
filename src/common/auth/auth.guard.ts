import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard as NestAuthGuard } from '@nestjs/passport';

@Injectable()
export class AuthGuard extends NestAuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _info: Error | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
