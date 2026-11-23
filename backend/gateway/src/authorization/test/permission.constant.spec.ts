import { PERMISSION_KEYS, Permission } from '../index';

describe('Permission constant', () => {
  const values = Object.values(Permission);

  it('uses unique codes in the resource:action format', () => {
    expect(new Set(values).size).toBe(values.length);
    for (const code of values) {
      expect(code).toMatch(/^[a-z_]+:[a-z_]+$/);
    }
  });

  it('names each key after its code so call sites read naturally', () => {
    for (const [name, code] of Object.entries(Permission)) {
      expect(name).toBe(code.toUpperCase().replace(':', '_'));
    }
  });

  it('exposes the same codes through PERMISSION_KEYS', () => {
    expect([...PERMISSION_KEYS]).toEqual(values);
  });

  it('keeps the codes the seed migration and the role mapping rely on', () => {
    expect(Permission.AI_USE).toBe('ai:use');
    expect(Permission.WORKSPACE_DELETE).toBe('workspace:delete');
    expect(Permission.MEMBER_UPDATE_ROLE).toBe('member:update_role');
  });
});
