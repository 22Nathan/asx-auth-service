import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { KeyService } from './services/key.service';
import { JwtService } from './services/jwt.service';
import { TaskService } from './services/task.service';
import { JwtModule } from '@nestjs/jwt';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_PIPE } from '@nestjs/core';
import * as Joi from 'joi';

@Module({
  imports: [
    JwtModule.register({}),
    CacheModule.register(),
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        HOST: Joi.string().hostname().default('localhost'),
        PORT: Joi.number().port().default(3001),
      }),
      validationOptions: {
        abortEarly: true
      }
    })
  ],
  controllers: [AuthController],
  providers: [
    JwtService, 
    KeyService, 
    TaskService,
    { 
      provide: APP_PIPE, 
      useFactory: () => new ValidationPipe({ 
        whitelist: true,  
        forbidNonWhitelisted: true,
        enableDebugMessages: true,
        disableErrorMessages: true,
      }) 
    }
  ],
})
export class AuthModule {}