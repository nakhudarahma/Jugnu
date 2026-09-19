import { verifyGoogleAccessToken } from '../src/services/google-oauth';

const fetchMock = jest.fn();
let failing = false;

beforeEach(() => {
  failing = false;
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  (verifyGoogleAccessToken as any).__fetchMock = fetchMock;
});

describe('verifyGoogleAccessToken', () => {
  it('rejects a token that tokeninfo flags as invalid', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: 'invalid_token' }) });

    await expect(verifyGoogleAccessToken('bad-tok', 'client-123')).rejects.toBeInstanceOf(Error);
  });

  it('rejects a response without a sub', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ aud: 'client-123' }) });

    await expect(verifyGoogleAccessToken('tok', 'client-123')).rejects.toBeInstanceOf(Error);
  });

  it('rejects a response without an email', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ aud: 'client-123', sub: 's1' }) });

    await expect(verifyGoogleAccessToken('tok', 'client-123')).rejects.toBeInstanceOf(Error);
  });

  it('rejects a token issued for a different audience', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ aud: 'another-client', sub: 's1', email: 'a@b.com' }),
    });

    await expect(verifyGoogleAccessToken('tok', 'client-123')).rejects.toBeInstanceOf(Error);
  });

  it('returns the profile for a valid token', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ aud: 'client-123', sub: 's1', email: 'asha@example.com', email_verified: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: 'Asha', picture: 'https://example.com/asha.jpg' }),
      });

    const profile = await verifyGoogleAccessToken('tok', 'client-123');

    expect(profile).toMatchObject({
      sub: 's1',
      email: 'asha@example.com',
      email_verified: true,
      name: 'Asha',
      picture: 'https://example.com/asha.jpg',
    });
  });

  it('falls back to an email-derived name when userinfo is unavailable', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ aud: 'client-123', sub: 's1', email: 'asha@example.com' }),
      })
      .mockRejectedValueOnce(new Error('network down'));

    const profile = await verifyGoogleAccessToken('tok', 'client-123');

    expect(profile.name).toBe('asha');
  });
});
