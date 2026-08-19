import type { Request, Response } from 'express';
import type { ApiSuccess, Bike } from '@ridesync/shared';
import { currentUser } from '../../middleware/require-auth.js';
import * as bikesService from './bikes.service.js';
import type { BikeInputBody } from './bikes.schema.js';

const bikeId = (req: Request): string => (req.params as { bikeId: string }).bikeId;

export async function list(req: Request, res: Response): Promise<void> {
  const data = await bikesService.list(currentUser(req).id);
  const body: ApiSuccess<Bike[]> = { data };
  res.json(body);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const data = await bikesService.getById(currentUser(req).id, bikeId(req));
  const body: ApiSuccess<Bike> = { data };
  res.json(body);
}

export async function create(req: Request, res: Response): Promise<void> {
  const data = await bikesService.create(currentUser(req).id, req.body as BikeInputBody);
  const body: ApiSuccess<Bike> = { data };
  res.status(201).json(body);
}

export async function update(req: Request, res: Response): Promise<void> {
  const data = await bikesService.update(currentUser(req).id, bikeId(req), req.body as BikeInputBody);
  const body: ApiSuccess<Bike> = { data };
  res.json(body);
}

export async function setDefault(req: Request, res: Response): Promise<void> {
  const data = await bikesService.setDefault(currentUser(req).id, bikeId(req));
  const body: ApiSuccess<Bike> = { data };
  res.json(body);
}

export async function remove(req: Request, res: Response): Promise<void> {
  await bikesService.remove(currentUser(req).id, bikeId(req));
  res.status(204).send();
}
