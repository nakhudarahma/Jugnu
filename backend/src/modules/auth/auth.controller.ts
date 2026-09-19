import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess } from '../../utils/api-response';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.register(req.body);
    sendSuccess(res, result, 'User registered successfully', 201);
  } catch (err) { next(err); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { identifier, password } = req.body;
    const result = await authService.login(identifier, password);
    sendSuccess(res, result, 'Login successful');
  } catch (err) { next(err); }
}

export async function google(req: Request, res: Response, next: NextFunction) {
  try {
    const { accessToken, role, createIfMissing } = req.body;
    const result = await authService.googleLogin(accessToken, { role, createIfMissing });
    sendSuccess(res, result, result.created ? 'Google account created' : 'Signed in with Google', result.created ? 201 : 200);
  } catch (err) { next(err); }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.logout(req.user!.id, req.body.refreshToken);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.refreshTokens(req.body.refreshToken);
    sendSuccess(res, result, 'Token refreshed successfully');
  } catch (err) { next(err); }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getMe(req.user!.id);
    sendSuccess(res, user);
  } catch (err) { next(err); }
}