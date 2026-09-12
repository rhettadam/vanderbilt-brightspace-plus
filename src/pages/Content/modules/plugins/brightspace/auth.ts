/**
 * Brightspace session auth (same-origin Valence OAuth via XSRF).
 */
let cachedToken: { accessToken: string; expiresAt: number } | null = null;
let cachedUserId: string | null = null;
let cachedVersions: { lp: string; le: string } | null = null;

function getXsrfToken(): string {
  try {
    return localStorage.getItem('XSRF.Token') || '';
  } catch {
    return '';
  }
}

export async function getBrightspaceAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const xsrf = getXsrfToken();
  if (!xsrf) {
    throw new Error('Missing XSRF.Token — are you logged into Brightspace?');
  }

  const response = await fetch('/d2l/lp/auth/oauth2/token', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Csrf-Token': xsrf,
    },
    body: 'scope=' + encodeURIComponent('*:*:*'),
  });

  if (!response.ok) {
    throw new Error(`Brightspace token request failed (${response.status})`);
  }

  const data = await response.json();
  const expiresIn = Number(data.expires_in) || 180;
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  return cachedToken.accessToken;
}

export async function brightspaceFetch(url: string): Promise<Response> {
  const token = await getBrightspaceAccessToken();
  return fetch(url, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
}

function pickVersion(
  versions: Array<{ ProductCode?: string; LatestVersion?: string }>,
  code: string,
  fallback: string
) {
  const entry = versions.find(
    (v) => String(v.ProductCode || '').toLowerCase() === code
  );
  return entry?.LatestVersion ? String(entry.LatestVersion) : fallback;
}

export async function getBrightspaceVersions(): Promise<{
  lp: string;
  le: string;
}> {
  if (cachedVersions) return cachedVersions;
  try {
    const res = await brightspaceFetch('/d2l/api/versions/');
    if (res.ok) {
      const versions = await res.json();
      cachedVersions = {
        lp: pickVersion(versions, 'lp', '1.46'),
        // mysubmissions needs LE >= 1.82
        le: pickVersion(versions, 'le', '1.82'),
      };
      return cachedVersions;
    }
  } catch {
    /* fall through */
  }
  cachedVersions = { lp: '1.46', le: '1.82' };
  return cachedVersions;
}

export async function getBrightspaceUserId(): Promise<string | null> {
  if (cachedUserId) return cachedUserId;
  try {
    const { lp } = await getBrightspaceVersions();
    const res = await brightspaceFetch(`/d2l/api/lp/${lp}/users/whoami`);
    if (!res.ok) return null;
    const data = await res.json();
    cachedUserId = String(data.Identifier ?? data.identifier ?? '');
    return cachedUserId || null;
  } catch {
    return null;
  }
}
