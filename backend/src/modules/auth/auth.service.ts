import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { BadRequestError, UnauthorizedError, ConflictError, NotFoundError } from '../../utils/errors';
import { UserRole } from '@prisma/client';
import { logger } from '../../utils/logger';
import { verifyGoogleAccessToken } from '../../services/google-oauth';

interface TokenPayload {
  id: string;
  role: UserRole;
  name: string;
}

function generateTokens(user: TokenPayload) {
  const accessToken = jwt.sign(user, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
  const refreshToken = jwt.sign({ id: user.id }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any });
  return { accessToken, refreshToken };
}

export async function register(data: {
  name: string;
  phone?: string;
  email?: string;
  password: string;
  role?: UserRole;
}) {
  if (!data.phone && !data.email) {
    throw new BadRequestError('Either phone or email is required');
  }
  
  if (data.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictError('Email already registered');
  }
  if (data.phone) {
    const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
    if (existing) throw new ConflictError('Phone number already registered');
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      passwordHash,
      role: data.role || UserRole.FAMILY_CAREGIVER,
    },
    select: { id: true, name: true, phone: true, email: true, role: true, createdAt: true },
  });

  const tokens = generateTokens({ id: user.id, role: user.role, name: user.name });
  
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokens: [tokens.refreshToken] },
  });

  logger.info('auth.register_success', { userId: user.id, role: user.role });

  return { user, ...tokens };
}

export async function login(identifier: string, password: string) {
  let user = await prisma.user.findUnique({ where: { email: identifier } });
  if (!user) {
    user = await prisma.user.findUnique({ where: { phone: identifier } });
  }
  if (!user) {
    logger.warn('auth.login_failed', { identifier });
    throw new UnauthorizedError('Invalid credentials');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    logger.warn('auth.login_failed', { identifier });
    throw new UnauthorizedError('Invalid credentials');
  }

  const tokens = generateTokens({ id: user.id, role: user.role, name: user.name });
  
  const existingTokens = (user.refreshTokens as string[]) || [];
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokens: [...existingTokens.slice(-4), tokens.refreshToken] },
  });

  logger.info('auth.login_success', { userId: user.id, role: user.role });

  return {
    user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role },
    ...tokens,
  };
}

export async function googleLogin(accessToken: string, opts: { role?: UserRole; createIfMissing?: boolean } = {}) {
  const profile = await verifyGoogleAccessToken(accessToken, env.GOOGLE_CLIENT_ID);
  const email = profile.email.toLowerCase();

  let user = await prisma.user.findUnique({ where: { email } });
  let created = false;

  if (!user) {
    if (!opts.createIfMissing) {
      logger.warn('auth.google_account_not_found', { email });
      throw new NotFoundError('No Jugnu account found for this Google account');
    }
    if (profile.email_verified === false) {
      throw new UnauthorizedError('Google email is not verified');
    }
    const passwordHash = await bcrypt.hash(randomBytes(24).toString('hex'), 12);
    user = await prisma.user.create({
      data: {
        name: profile.name || email.split('@')[0],
        email,
        passwordHash,
        role: opts.role || UserRole.FAMILY_CAREGIVER,
      },
    });
    created = true;
  }

  const tokens = generateTokens({ id: user.id, role: user.role, name: user.name });
  const existingTokens = (user.refreshTokens as string[]) || [];
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokens: [...existingTokens.slice(-4), tokens.refreshToken] },
  });

  logger.info('auth.google_success', { userId: user.id, created });

  return {
    user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role, googleId: profile.sub },
    ...tokens,
    created,
  };
}

export async function logout(userId: string, refreshToken?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  logger.info('auth.logout', { userId });

  if (refreshToken) {
    const tokens = (user.refreshTokens as string[]) || [];
    await prisma.user.update({
      where: { id: userId },
      data: { refreshTokens: tokens.filter(t => t !== refreshToken) },
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshTokens: [] },
    });
  }
  return { message: 'Logged out successfully' };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, phone: true, email: true, role: true, createdAt: true, updatedAt: true },
  });
  if (!user) throw new NotFoundError('User not found');
  return user;
}

export async function refreshTokens(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { id: string };
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) throw new UnauthorizedError('Invalid refresh token');
    
    const tokens = (user.refreshTokens as string[]) || [];
    if (!tokens.includes(refreshToken)) throw new UnauthorizedError('Refresh token revoked');

    const newTokens = generateTokens({ id: user.id, role: user.role, name: user.name });
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokens: [...tokens.filter(t => t !== refreshToken).slice(-4), newTokens.refreshToken] },
    });
    return newTokens;
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }
}