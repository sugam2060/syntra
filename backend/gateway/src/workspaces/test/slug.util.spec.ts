import {
  RESERVED_SLUGS,
  SLUG_MAX_LENGTH,
  SLUG_MIN_LENGTH,
  getSlugProblem,
  isValidSlugFormat,
} from '../utils/slug.util';

describe('slug.util', () => {
  describe('isValidSlugFormat', () => {
    it.each(['acme', 'acme-corp', 'team-42', '123', 'a1b'])('accepts %s', (slug) => {
      expect(isValidSlugFormat(slug)).toBe(true);
    });

    it.each([
      ['too short', 'ab'],
      ['uppercase', 'Acme'],
      ['spaces', 'acme corp'],
      ['leading hyphen', '-acme'],
      ['trailing hyphen', 'acme-'],
      ['double hyphen', 'acme--corp'],
      ['underscore', 'acme_corp'],
      ['dot', 'acme.corp'],
      ['slash', 'acme/corp'],
      ['unicode', 'café'],
      ['empty', ''],
    ])('rejects %s', (_label, slug) => {
      expect(isValidSlugFormat(slug)).toBe(false);
    });

    it('enforces the length bounds', () => {
      expect(isValidSlugFormat('a'.repeat(SLUG_MIN_LENGTH))).toBe(true);
      expect(isValidSlugFormat('a'.repeat(SLUG_MIN_LENGTH - 1))).toBe(false);
      expect(isValidSlugFormat('a'.repeat(SLUG_MAX_LENGTH))).toBe(true);
      expect(isValidSlugFormat('a'.repeat(SLUG_MAX_LENGTH + 1))).toBe(false);
    });
  });

  describe('getSlugProblem', () => {
    it('is null for a usable slug', () => {
      expect(getSlugProblem('acme-corp')).toBeNull();
    });

    it('reports a malformed slug as invalid', () => {
      expect(getSlugProblem('Not A Slug')).toBe('invalid');
    });

    it('reports reserved words, which would collide with app routes', () => {
      expect(getSlugProblem('admin')).toBe('reserved');
      expect(getSlugProblem('new')).toBe('reserved');
      expect(getSlugProblem('api')).toBe('reserved');
    });

    it('reserves only well-formed slugs, so the set is always checkable', () => {
      for (const word of RESERVED_SLUGS) {
        expect(isValidSlugFormat(word)).toBe(true);
      }
    });
  });
});
