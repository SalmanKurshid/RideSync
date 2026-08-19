import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import { validate } from '../../middleware/validate.js';
import { uuidParam } from '../../lib/validators.js';
import * as controller from './bikes.controller.js';
import { bikeInputSchema, bikeUpdateSchema } from './bikes.schema.js';

export const bikesRouter: Router = Router();

const withId = validate(uuidParam('bikeId'), 'params');

bikesRouter.use(requireAuth);

bikesRouter.get('/', controller.list);
bikesRouter.post('/', validate(bikeInputSchema), controller.create);
bikesRouter.get('/:bikeId', withId, controller.getById);
bikesRouter.put('/:bikeId', withId, validate(bikeUpdateSchema), controller.update);
bikesRouter.patch('/:bikeId/default', withId, controller.setDefault);
bikesRouter.delete('/:bikeId', withId, controller.remove);
