import { PasswordService } from '../password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes with argon2id and never returns the plain password', async () => {
    const hash = await service.hash('correct horse battery');
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain('correct horse battery');
  });

  it('produces a different hash for the same password (random salt)', async () => {
    const [a, b] = await Promise.all([service.hash('same-password'), service.hash('same-password')]);
    expect(a).not.toEqual(b);
  });

  it('verifies the right password and rejects the wrong one', async () => {
    const hash = await service.hash('s3cret-passphrase');
    await expect(service.verify(hash, 's3cret-passphrase')).resolves.toBe(true);
    await expect(service.verify(hash, 'wrong')).resolves.toBe(false);
  });

  it('treats a malformed stored hash as a failed verification', async () => {
    await expect(service.verify('not-a-hash', 'anything')).resolves.toBe(false);
  });

  it('can burn verification time against a dummy hash without throwing', async () => {
    await expect(service.verifyAgainstDummy('whatever')).resolves.toBeUndefined();
  });
});
