import { ROUTES } from '@/lib/routes';

describe('ROUTES', () => {
  it('keeps the admin console off the guessable /admin path', () => {
    expect(ROUTES.admin).toBe('/time/Portal/admIn/');
    expect(ROUTES.admin.toLowerCase()).not.toBe('/admin/');
  });

  it('every route is absolute and (except home) ends with a slash for the static export', () => {
    for (const [key, path] of Object.entries(ROUTES)) {
      expect(path.startsWith('/')).toBe(true);
      if (key !== 'home') expect(path.endsWith('/')).toBe(true);
    }
  });
});
