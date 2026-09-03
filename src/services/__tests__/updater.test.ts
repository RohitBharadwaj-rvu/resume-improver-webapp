import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isNewerVersion, checkGitHubUpdate } from '../updater';

describe('updater service', () => {
  it('correctly compares semantic version tags', () => {
    expect(isNewerVersion('v1.0.2', 'v1.0.1')).toBe(true);
    expect(isNewerVersion('1.1.0', '1.0.9')).toBe(true);
    expect(isNewerVersion('v2.0.0', '1.9.9')).toBe(true);
    expect(isNewerVersion('v1.0.1', 'v1.0.1')).toBe(false);
    expect(isNewerVersion('v1.0.0', 'v1.0.1')).toBe(false);
  });

  describe('checkGitHubUpdate', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('returns update info when newer release is available on GitHub', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          tag_name: 'v1.2.0',
          html_url: 'https://github.com/RohitBharadwaj-rvu/resume-improver-webapp/releases/tag/v1.2.0',
          body: 'Added new features and bug fixes',
          published_at: '2026-09-04T00:00:00Z',
        }),
      });

      const res = await checkGitHubUpdate('v1.0.1');
      expect(res.hasUpdate).toBe(true);
      expect(res.latestVersion).toBe('v1.2.0');
      expect(res.releaseUrl).toContain('v1.2.0');
    });

    it('returns hasUpdate false when on current or newer version', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          tag_name: 'v1.0.1',
          html_url: 'https://github.com/RohitBharadwaj-rvu/resume-improver-webapp/releases/tag/v1.0.1',
          body: '',
        }),
      });

      const res = await checkGitHubUpdate('v1.0.1');
      expect(res.hasUpdate).toBe(false);
      expect(res.latestVersion).toBe('v1.0.1');
    });
  });
});
