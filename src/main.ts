import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AuthModule, {
    transport: Transport.TCP,
    options: {
      host: process.env.HOST,
      port: Number(process.env.PORT),
    }
  });
  await app.listen();
}
bootstrap();