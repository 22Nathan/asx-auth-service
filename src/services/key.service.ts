import { mkdir, rm, readdir } from 'fs/promises';
import * as atom from 'atomically';
import * as path from 'path';
import * as crypto from 'node:crypto';
import { KEYS_DIR, PUBLIC_KEY_REGEX, PRIVATE_KEY_REGEX, KEY_REGEX } from '../common/constant';
import { sortKeyFilesAsc, unwrap } from '../common/utils';
import { until } from 'until-async';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as dayjs from 'dayjs';

@Injectable()
export class KeyService {
  private readonly logger = new Logger(KeyService.name, { timestamp: true });

  constructor() {}

  // ------------------------------------------------------------------ //

  async generateKeyPair() {
    unwrap(
      await until(() => mkdir(KEYS_DIR, { recursive: true })),
      this.logger, '[keyService::generateKeyPair::0::mkdir.keydir]', true
    );

    const dateNow = dayjs().valueOf(); 
    const randomHex = crypto.randomBytes(3).toString('hex');
    const fileFormat = (type: 'public' | 'private') => `${dateNow}-${randomHex}-key-${type}.pem`;

    const privateKeyPath = path.join(KEYS_DIR, fileFormat('private'));
    const publicKeyPath = path.join(KEYS_DIR, fileFormat('public'));

    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase: '//TODO',
      },
    });

    unwrap(
      await until(() => atom.writeFile(privateKeyPath, privateKey, { mode: 0o600 })),
      this.logger, '[keyService::generateKeyPair::1::atom.writeFile.privatekey]', true
    );

    const [errorWritePublicKey] = await until(() => atom.writeFile(publicKeyPath, publicKey, { mode: 0o644 }));
    if (errorWritePublicKey) {
      const [errorRemovePrivateKey] = await until(() => rm(privateKeyPath, { force: true }));
      if (errorRemovePrivateKey) this.logger.error('[keyService::generateKeyPair::3::rm.privatekey]', errorRemovePrivateKey);
      
      this.logger.error('[keyService::generateKeyPair::2::atom.writeFile.publickey]', errorWritePublicKey);
      throw new InternalServerErrorException();
    }
  } 

  // ------------------------------------------------------------------ //

  async getCurrentPrivateKey() {
    const files = unwrap(
      await until(() => readdir(KEYS_DIR)),
      this.logger, '[keyService::getCurrentPrivateKey::0::readdir.keydir]',
    );

    const privateKeysName = files.filter(file => PRIVATE_KEY_REGEX.test(file));
    const sortedPrivateKeysName = sortKeyFilesAsc(privateKeysName);
    const currentPrivateKey = sortedPrivateKeysName.pop();

    if (!currentPrivateKey) {
      this.logger.error('[keyService::getCurrentPrivateKey::1::sort', sortedPrivateKeysName);
      throw new InternalServerErrorException();
    }

    const encryptedPem = unwrap(
      await until(() => atom.readFile(path.join(KEYS_DIR, currentPrivateKey.fileName), 'utf-8' )), 
      this.logger, '[keyService::getCurrentPrivateKey::2::atom.readfile.privatekey]',
    );

    const privateKeyObject = crypto.createPrivateKey({
      key: encryptedPem,
      format: 'pem',
      passphrase: '//TODO',
    });
    const privateKey = privateKeyObject.export({
      type: 'pkcs8',
      format: 'pem',
    });

    return { kid: currentPrivateKey.kid, key: privateKey };
  }

  // ------------------------------------------------------------------ //

  async getPublicKeyByKid(kid: string) {
    const files = unwrap(
      await until(() => readdir(KEYS_DIR)),
      this.logger, '[keyService::getPublicKeyByKid::0::readdir.keydir]',
    );

    const fileName = files.find(file => file === `${kid}-key-public.pem`);
    if (!fileName) {
      this.logger.error('[keyService::getPublicKeyByKid::1::get.file]');
      throw new InternalServerErrorException();
    }

    return unwrap(
      await until(() => atom.readFile(path.join(KEYS_DIR, fileName), 'utf-8' )),
      this.logger, '[keyService::getPublicKeyByKid::2::atom.readfile.publickey]',
    );    
  }

  // ------------------------------------------------------------------ //

  async getWellKnownJwks() {
    const files = unwrap(
      await until(() => readdir(KEYS_DIR)),
      this.logger, '[keyService::getWellKnownJwks::0::readdir.keydir]',
    );

    const publicKeysName = files.filter(file => PUBLIC_KEY_REGEX.test(file));
    const sortedPublicKeysName = sortKeyFilesAsc(publicKeysName);

    if (sortedPublicKeysName.length === 0) {
      this.logger.error('[keyService::getWellKnonwJwks::1::sort]', sortedPublicKeysName);
      throw new InternalServerErrorException();
    } 

    const publicKeys = sortedPublicKeysName.map(async ({ fileName, kid }) => {
      const pem = unwrap(
        await until(() => atom.readFile(path.join(KEYS_DIR, fileName), 'utf-8' )),
        this.logger, '[keyService::getWellKnownJwks::2::atom.readfile.publickey]',
      );

      const jwk = crypto.createPublicKey(pem).export({ format: 'jwk' });

      return {
        ...jwk,
        kid,
        use: 'sig',
        alg: 'RS256',
        kty: 'RSA',
      };
    });

    return Promise.all(publicKeys);
  }

  // ------------------------------------------------------------------ //

  async revokeOldKeys() {
    const files = unwrap(
      await until(() => readdir(KEYS_DIR)),
      this.logger, '[keyService::revokeOldKeys::0::readdir.keydir]',
    );

    const oldKeysName = files.filter(file => {
      const initialDate = parseInt(file.split('-')[0], 10);
      if (isNaN(initialDate) || !dayjs(initialDate).isValid()) return false;
      
      const isOlderThanOneWeek = dayjs().diff(dayjs(initialDate), 'day') >= 7;
      return isOlderThanOneWeek;
    });

    const results = await Promise.allSettled(
      oldKeysName.map(file => rm(path.join(KEYS_DIR, file), { force: true }))
    );

    const rejected = results.filter(result => result.status === 'rejected');
    if (rejected.length > 0) {
      this.logger.error('[keyService::revokeOldKeys::1::rm.key]', rejected);
      throw new InternalServerErrorException();
    }
  }

  // ------------------------------------------------------------------ //

  async isKeyDirEmpty() {
    unwrap(
      await until(() => mkdir(KEYS_DIR, { recursive: true })),
      this.logger, '[keyService::isKeyDirEmpty::0::mkdir.keydir]', true
    );

    const files = unwrap(
      await until(() => readdir(KEYS_DIR)),
      this.logger, '[keyService::isKeyDirEmpty::1::readdir.keydir]', true
    );

    const keyFiles = (files || []).filter(file => KEY_REGEX.test(file));

    return keyFiles.length === 0;
  }

  // ------------------------------------------------------------------ //
}