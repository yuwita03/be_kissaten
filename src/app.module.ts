import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { UserModule } from './user/user.module';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
