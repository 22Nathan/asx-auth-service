import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { JwtService } from './services/jwt.service';
import { KeyService } from './services/key.service';
import { SignTokenDto } from './dto/signToken.dto';

@Controller()
export class AuthController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly keyService: KeyService,
  ) {}

  @CacheTTL(0)
  @CacheKey('jwks')
  @UseInterceptors(CacheInterceptor)
  @MessagePattern({ cmd: 'get_jwks' })
  async getJwks() {
    const publicKeys = await this.keyService.getWellKnownJwks();
    return { keys: publicKeys };
  }

  @MessagePattern({ cmd: 'sign_token' })
  async signToken(@Payload() data: SignTokenDto) {
    return this.jwtService.signToken(data.userId, data.which, data.claims);
  }
}
