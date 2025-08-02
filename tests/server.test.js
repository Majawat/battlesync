const request = require('supertest');
const { app, server } = require('../src/server');

describe('BattleSync v2 API', () => {
  afterAll(() => {
    server.close();
  });

  test('GET / should return API info', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('BattleSync v2 API');
    expect(response.body.version).toBe('2.0.0');
  });

  test('GET /health should return health status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.version).toBe('2.0.0');
    expect(response.body.timestamp).toBeDefined();
  });
});