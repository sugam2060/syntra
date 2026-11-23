import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/** argon2id with the OWASP-recommended minimum parameters (19 MiB, 2 iterations, 1 lane). */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** Password hashing. Hashes are self-describing, so parameters can be raised later without a migration. */
@Injectable()
export class PasswordService {
  private dummyHash?: Promise<string>;

  hash(plain: string): Promise<string> {
    return argon2.hash(plain, ARGON2_OPTIONS);
  }

  /** Never throws: a malformed stored hash simply fails verification. */
  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  /**
   * Burns the same CPU time as a real verification. Call it when no account matches so a
   * login attempt takes about as long whether or not the email exists.
   */
  async verifyAgainstDummy(plain: string): Promise<void> {
    this.dummyHash ??= this.hash('dummy-password-for-timing-equalisation');
    await this.verify(await this.dummyHash, plain);
  }
}
