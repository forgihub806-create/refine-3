import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { startServer, stopServer } from './index';
import type { Server } from 'http';
import type { Express } from 'express';

describe('API Routes', () => {
  let app: Express.Application;
  let server: Server;
  let port: number;

  beforeAll(async () => {
    process.env.PORT = '0';
    const serverInfo = await startServer(':memory:');
    app = serverInfo.app;
    server = serverInfo.server;
    port = serverInfo.port;
  });

  afterAll(async () => {
    await stopServer();
  });

  it('should respond to /health with OK', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.text).toBe('OK');
  });

  it('should create a media item', async () => {
    const response = await request(app)
      .post('/api/media')
      .send({ urls: ['http://example.com/video.mp4'] });
    expect(response.status).toBe(201);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBe(1);
    expect(response.body[0].url).toBe('http://example.com/video.mp4');
  });

  it('should create and get a tag', async () => {
    const createResponse = await request(app)
      .post('/api/tags')
      .send({ name: 'Test Tag', color: 'blue' });
    expect(createResponse.status).toBe(201);
    expect(createResponse.body.name).toBe('Test Tag');

    const getResponse = await request(app).get('/api/tags');
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.some(tag => tag.name === 'Test Tag')).toBe(true);
  });

  it('should create and get a category', async () => {
    // Note: The routes for categories are not implemented yet.
    // This test will fail until they are.
    const createResponse = await request(app)
      .post('/api/categories')
      .send({ name: 'Test Category' });
    expect(createResponse.status).toBe(201);
    expect(createResponse.body.name).toBe('Test Category');

    const getResponse = await request(app).get('/api/categories');
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.some(cat => cat.name === 'Test Category')).toBe(true);
  });
});
