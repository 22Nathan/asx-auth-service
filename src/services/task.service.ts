import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { KeyService } from './key.service';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { until } from 'until-async';

@Injectable()
export class TaskService implements OnModuleInit {
  private readonly logger = new Logger(TaskService.name, { timestamp: true });

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly keyService: KeyService,
  ) {}

  async onModuleInit() {
    const isKeyDirEmpty = await this.keyService.isKeyDirEmpty();
    if (isKeyDirEmpty) await this.generateKeys();
    await this.revokeOldKeys();
  }

  @Cron(CronExpression.EVERY_DAY_AT_10AM ,{ 
    name: 'key-generation',
    timeZone: 'Europe/Paris',
  })
  async generateKeys() {
    this.logger.log('[task::generateKeys] Starting key generation...');

    const [error] = await until(() => this.keyService.generateKeyPair());
    if (error) {
      this.logger.error('[task::generateKeys::generateKeyPair]', error);
      return;
    }

    const [errorCache] = await until(() => this.cacheManager.del('jwks'));
    if (errorCache) {
      this.logger.error('[task::generateKeys::cache.del]', errorCache);
      return;
    }

    this.logger.log('[task::generateKeys] Key generation completed');
  }

  @Cron(CronExpression.EVERY_DAY_AT_NOON, {
    name: 'revoke-old-keys',
    timeZone: 'Europe/Paris',
  })
  async revokeOldKeys() {
    this.logger.log('[task::revokeOldKeys] Starting old keys revocation...');

    const [error] = await until(() => this.keyService.revokeOldKeys());
    if (error) {
      this.logger.error('[task::revokeOldKeys::revokeOldKeys]', error);
      return;
    }

    const [errorCache] = await until(() => this.cacheManager.del('jwks'));
    if (errorCache) {
      this.logger.error('[task::revokeOldKeys::cache.del]', errorCache);
      return;
    }

    this.logger.log('[task::revokeOldKeys] Old keys revocation completed');
  }
}