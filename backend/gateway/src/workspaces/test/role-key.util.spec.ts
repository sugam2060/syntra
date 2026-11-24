import { roleKeyFromName } from '../utils/role-key.util';

describe('roleKeyFromName', () => {
  it.each([
    ['Project Lead', 'project-lead'],
    ['  QA / Testers  ', 'qa-testers'],
    ['Ünïcode Dev', 'n-code-dev'],
    ['already-a-key', 'already-a-key'],
    ['UPPER_snake', 'upper-snake'],
    ['a'.repeat(80), 'a'.repeat(48)],
  ])('turns %j into %j', (name, key) => {
    expect(roleKeyFromName(name)).toBe(key);
  });

  it('returns an empty string when nothing usable remains', () => {
    expect(roleKeyFromName('***')).toBe('');
    expect(roleKeyFromName('   ')).toBe('');
  });

  it('never ends or starts with a hyphen after truncation', () => {
    const key = roleKeyFromName(`${'a'.repeat(47)} b`);
    expect(key).toBe('a'.repeat(47));
  });
});
