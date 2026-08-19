import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes.js';
import { bikesRouter } from './modules/bikes/bikes.routes.js';

export const apiRouter: Router = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ data: { status: 'ok' } });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/bikes', bikesRouter);
