import { api, rawFetch } from '@/lib/api'

export interface LoginResponse {
  user: { id: string; name: string; phone?: string; email?: string; role: string }
  accessToken: string
  refreshToken: string
}

export interface RegisterResponse extends LoginResponse {}

export interface GoogleLoginResponse extends LoginResponse {
  user: LoginResponse['user'] & { googleId?: string }
  /** True when the backend created the account on this call. */
  created?: boolean
}

export async function login(identifier: string, password: string): Promise<LoginResponse | null> {
  return api<LoginResponse>('/auth/login', {
    method: 'POST',
    json: { identifier, password },
  })
}

export async function register(data: {
  name: string
  email?: string
  phone?: string
  password: string
  role?: string
}): Promise<RegisterResponse | null> {
  return api<RegisterResponse>('/auth/register', {
    method: 'POST',
    json: data,
  })
}

/**
 * Server-verified Google sign-in. Unlike the queueing `api()` helpers, this uses
 * `rawFetch` so auth failures (e.g. "no account found") surface as `ApiError`
 * with the real status code instead of being swallowed by the offline queue.
 */
export async function googleLogin(
  accessToken: string,
  opts: { role?: string; createIfMissing?: boolean } = {},
): Promise<GoogleLoginResponse> {
  return rawFetch<GoogleLoginResponse>('/auth/google', {
    method: 'POST',
    json: { accessToken, role: opts.role, createIfMissing: opts.createIfMissing },
  })
}

export async function getMe(): Promise<{ id: string; name: string; phone?: string; email?: string; role: string } | null> {
  return api('/auth/me')
}

export async function logout(refreshToken?: string): Promise<void | null> {
  await api('/auth/logout', { method: 'POST', json: { refreshToken } })
}
