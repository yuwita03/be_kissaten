import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          imgSrc: [`'self'`, 'data:', 'https://images.unsplash.com', 'https://res.cloudinary.com'],
          mediaSrc: [`'self'`, 'https://res.cloudinary.com'],
          scriptSrc: [`'self'`],
          connectSrc: [`'self'`, 'https://app.sandbox.midtrans.com'],
        },
      },
    }),
  );

  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });

  app.enableCors({
    origin: true, // sesuaikan port Vite kamu
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Neko Store API')
    .setDescription('E-commerce backend API for Neko Store')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application running on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}
void bootstrap();