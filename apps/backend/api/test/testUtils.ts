import { Express } from 'express';
import request from 'supertest';
import { createServer } from '../server';

export const getTestServer = async (): Promise<Express> => {
  const app = await createServer();
  return app;
};

export const testRequest = (app: Express) => {
  return request(app);
};
