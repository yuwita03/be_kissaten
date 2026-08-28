import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard as NestAuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalAuthGuard extends NestAuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context) as Promise<boolean> | boolean;
  }

  handleRequest<TUser = unknown>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _err: Error | null,
    user: TUser | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _info: Error | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: ExecutionContext,
  ): TUser | null {
    return user || null;
  }
}