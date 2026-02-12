import { IsString, IsDefined, IsOptional, IsEnum, IsObject } from 'class-validator';
import { WhichToken } from '../common/definition';

export class SignTokenDto {
  @IsDefined()
  @IsString()
  userId: string;

  @IsDefined()
  @IsEnum(WhichToken)
  which: WhichToken;

  @IsOptional()
  @IsObject()
  claims?: Record<string, any>;
}