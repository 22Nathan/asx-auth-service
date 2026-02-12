import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { KeyService } from './key.service';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name, { timestamp: true });

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly keyService: KeyService,
  ) {}

  @Cron(CronExpression.EVERY_WEEK ,{ 
    name: 'key-rotation',
    timeZone: 'Europe/Paris',
  })
  async generateKeys() {
    this.logger.log('[task::generateKeys] Starting key rotation...');
    await this.keyService.generateKeyPair();
    await this.cacheManager.del('jwks');
    this.logger.log('[task::generateKeys] Key rotation completed');
  }

  @Cron(CronExpression.EVERY_DAY_AT_NOON, {
    name: 'revoke-old-keys',
    timeZone: 'Europe/Paris',
  })
  async revokeOldKeys() {
    this.logger.log('[task::revokeOldKeys] Starting old keys revocation...');
    await this.keyService.revokeOldKeys();
    await this.cacheManager.del('jwks');
    this.logger.log('[task::revokeOldKeys] Old keys revocation completed');
  }
}