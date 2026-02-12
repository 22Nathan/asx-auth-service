import { until } from 'until-async';
import { Injectable, InternalServerErrorException, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { KeyService } from './key.service';
import { SignTokenWrapper, WhichToken } from '../common/definition';

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name, { timestamp: true });

  constructor(
    private jwtService: NestJwtService,
    private keyService: KeyService,
  ) {}

  private handleJwtTokenError(error: Error) {
    if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError) {
      this.logger.error('[JwtService::handleJwtTokenError::0::token.expired.or.invalid]', error);
      throw new UnauthorizedException();
    }

    this.logger.error('[JwtService::handleJwtTokenError::1::token.error]', error);
    throw new InternalServerErrorException();
  }

  // ------------------------------------------------------------------ //

  async signToken(userId: string, which: WhichToken, claims?: Record<string, any>): Promise<{ accessToken: string; refreshToken: string }>;
  async signToken(userId: string, which: WhichToken, claims?: Record<string, any>): Promise<{ accessToken: string }>;
  async signToken(userId: string, which: WhichToken, claims?: Record<string, any>): Promise<{ refreshToken: string }>;

  async signToken(userId: string, which: WhichToken, claims?: Record<string, any>) {
    const { kid, key } = await this.keyService.getCurrentPrivateKey();
    const wrapper = { kid, key, userId, claims };
    
    switch(which) {
      case WhichToken.BOTH:      
        return this.signTokenPair(wrapper);
      case WhichToken.ACCESS:    
        return { accessToken: await this.signAccessToken(wrapper) };
      case WhichToken.REFRESH:   
        return { refreshToken: await this.signRefreshToken(wrapper) };
      default:
        this.logger.error('[JwtService::signToken::0::default]', wrapper);
        throw new InternalServerErrorException();
    }
  }

  // ------------------------------------------------------------------ //

  async signTokenPair(wrapper: SignTokenWrapper) {
    const accessToken = await this.signAccessToken(wrapper);
    const refreshToken = await this.signRefreshToken(wrapper);

    return { accessToken, refreshToken };
  }

  // ------------------------------------------------------------------ //

  async signAccessToken({ kid, key, userId, claims }: SignTokenWrapper) {
    const [error, accessToken] = await until(() => this.jwtService.signAsync(
      { sub: userId, type: 'access', ...(claims || {}) },
      {
        algorithm: 'RS256',
        keyid: kid,
        issuer: 'auth-service',
        expiresIn: '1h',
        privateKey: key,
      }
    ));
    if (error) this.handleJwtTokenError(error);

    return accessToken as string;
  }

  // ------------------------------------------------------------------ //

  async signRefreshToken({ kid, key, userId }: SignTokenWrapper) {
    const [error, refreshToken] = await until(() => this.jwtService.signAsync(
      { sub: userId, type: 'refresh' }, 
      {
        algorithm: 'RS256',
        keyid: kid,
        issuer: 'auth-service',
        expiresIn: '7d',
        privateKey: key,
      }
    ));
    if (error) this.handleJwtTokenError(error);

    return refreshToken as string;
  }

  // ------------------------------------------------------------------ //
}