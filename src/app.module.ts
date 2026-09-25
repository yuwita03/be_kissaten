import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';

import { UserModule } from './user/user.module';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';
import { ResetModule } from './reset/reset.module';
import { CartModule } from './cart/cart.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // 2. Registrasi CacheModule menggunakan ConfigService
CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
        return {
          stores: [createKeyv(redisUrl)],
          ttl: 60 * 1000,
        };
      },
    }),

    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // window waktu: 60 detik
        limit: 30,  // maksimal 30 request per window, per IP
      },
    ]),
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, ...meta }) => {
              const metaStr = Object.keys(meta).length
                ? JSON.stringify(meta)
                : '';
              return `${String(timestamp)} [${String(level)}]: ${String(message)} ${metaStr}`;
            }),
          ),
        }),
      ],
    }),
    UserModule,
    CategoryModule,
    ProductModule,
    OrderModule,
    ResetModule,
    CartModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}