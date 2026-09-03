export interface AppUpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseUrl: string;
  downloadUrl: string;
  releaseNotes?: string;
  publishedAt?: string;
}

export const CURRENT_APP_VERSION = 'v1.0.3';

export function isNewerVersion(latest: string, current: string): boolean {
  const lParts = latest.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const cParts = current.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
    const l = lParts[i] || 0;
    const c = cParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

export async function checkGitHubUpdate(currentVersion: string = CURRENT_APP_VERSION): Promise<AppUpdateInfo> {
  const repo = 'RohitBharadwaj-rvu/resume-improver-webapp';
  const url = `https://api.github.com/repos/${repo}/releases/latest`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to check for updates: Server responded with ${response.status}`);
  }

  const data = await response.json();
  const latestTag = (data.tag_name || '').trim();
  const hasUpdate = isNewerVersion(latestTag, currentVersion);

  const zipAsset = Array.isArray(data.assets)
    ? data.assets.find((a: any) => a.name && a.name.endsWith('.zip'))
    : null;
  const downloadUrl = zipAsset
    ? zipAsset.browser_download_url
    : `https://github.com/${repo}/releases/latest/download/Resume-ATS-Improver-Windows-x64.zip`;

  return {
    currentVersion,
    latestVersion: latestTag || currentVersion,
    hasUpdate,
    releaseUrl: data.html_url || `https://github.com/${repo}/releases/latest`,
    downloadUrl,
    releaseNotes: data.body || '',
    publishedAt: data.published_at,
  };
}
