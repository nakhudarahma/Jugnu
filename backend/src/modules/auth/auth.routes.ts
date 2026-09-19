import { Router } from 'express';
import * as controller from './auth.controller';
import auth from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { z } from 'zod';

const router = Router();

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).max(100),
    role: z.enum(['FAMILY_CAREGIVER', 'CONNECTED_FAMILY', 'HEALTH_WORKER', 'ADMIN']).optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(1),
    password: z.string().min(1),
  }),
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

const googleSchema = z.object({
  body: z.object({
    accessToken: z.string().min(1),
    role: z.enum(['FAMILY_CAREGIVER', 'CONNECTED_FAMILY', 'HEALTH_WORKER']).optional(),
    createIfMissing: z.boolean().optional(),
  }),
});

router.post('/register', validate(registerSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);
router.post('/google', validate(googleSchema), controller.google);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/logout', auth, controller.logout);
router.get('/me', auth, controller.me);

export default router;