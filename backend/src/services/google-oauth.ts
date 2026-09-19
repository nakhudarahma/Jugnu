import { UnauthorizedError } from '../utils/errors';

export interface GoogleProfile {
  sub: string;
  name: string;
  email: string;
  email_verified?: boolean;
  picture?: string;
}

/**
 * Verifies a Google Identity Services access token server-side and returns the
 * account's profile. Two calls:
 *  1. `/tokeninfo` — validates the token and returns `aud`, `sub`, `email`.
 *  2. `/v3/userinfo` — returns the display name / photo (best effort).
 *
 * The token must match the expected OAuth client audience, otherwise it is
 * rejected. Pure function (no database/env imports) so it stays unit-testable.
 */
export async function verifyGoogleAccessToken(
  accessToken: string,
  expectedAudience?: string,
): Promise<GoogleProfile> {
  const tokenInfoRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!tokenInfoRes.ok) {
    throw new UnauthorizedError('Invalid Google token');
  }

  const tokenInfo = (await tokenInfoRes.json()) as {
    aud?: string;
    sub?: string;
    email?: string;
    email_verified?: boolean | string;
  };

  if (!tokenInfo.sub || !tokenInfo.email) {
    throw new UnauthorizedError('Invalid Google token');
  }
  if (expectedAudience && tokenInfo.aud !== expectedAudience) {
    throw new UnauthorizedError('Invalid Google token');
  }

  let name = '';
  let picture: string | undefined;
  try {
    const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (infoRes.ok) {
      const info = (await infoRes.json()) as { name?: string; picture?: string };
      name = info.name || '';
      picture = info.picture;
    }
  } catch {
    // Display name is optional — keep going with the email-derived name.
  }

  const verified =
    tokenInfo.email_verified === true || tokenInfo.email_verified === 'true';

  return {
    sub: tokenInfo.sub,
    email: tokenInfo.email,
    email_verified: verified,
    name: name || tokenInfo.email.split('@')[0],
    picture,
  };
}