// reset.module.ts
import { Module } from '@nestjs/common';
import { ResetService } from './reset.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  providers: [ResetService, PrismaService],
})
export class ResetModule {}