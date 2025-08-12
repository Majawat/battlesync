import request from 'supertest';
import { app } from '../src/server';
import { db } from '../src/database/db';
import { EXPECTED_VERSION } from './constants';

describe('BattleSync v2 API', () => {
  beforeAll(async () => {
    // Initialize database for tests (in-memory)
    await db.initialize();
  });

  afterAll(async () => {
    // Close database connection after tests
    await db.close();
  });

  test('GET / should return API info', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('BattleSync v2 API');
    expect(response.body.version).toBe(EXPECTED_VERSION);
  });

  test('GET /health should return health status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.version).toBe(EXPECTED_VERSION);
    expect(response.body.timestamp).toBeDefined();
  });
});