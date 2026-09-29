import { ROUTES } from '@/lib/routes';

describe('ROUTES', () => {
  it('uses the conventional admin path', () => {
    expect(ROUTES.admin).toBe('/admin/');
  });

  it('every route is absolute and (except home) ends with a slash for the static export', () => {
    for (const [key, path] of Object.entries(ROUTES)) {
      expect(path.startsWith('/')).toBe(true);
      if (key !== 'home') expect(path.endsWith('/')).toBe(true);
    }
  });
});
