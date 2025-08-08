import request from 'supertest';
import { app, startServer } from '../src/server';
import { db } from '../src/database/db';

describe('Army Import API', () => {
  beforeAll(async () => {
    await db.initialize();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    // Clean up armies table before each test
    await db.run('DELETE FROM armies');
  });

  describe('POST /api/armies/import', () => {
    it('should import army from ArmyForge successfully', async () => {
      const response = await request(app)
        .post('/api/armies/import')
        .send({ armyForgeId: 'IJ1JM_m-jmka' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.army).toBeDefined();
      expect(response.body.army.name).toBe("Dev Testerson's Bullshit Army");
      expect(response.body.army.list_points).toBe(3080);
      expect(response.body.army.model_count).toBe(44);
      expect(response.body.army.activation_count).toBe(8);
    });

    it('should return 400 for missing armyForgeId', async () => {
      const response = await request(app)
        .post('/api/armies/import')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('armyForgeId is required');
    });

    it('should return 404 for invalid ArmyForge ID', async () => {
      const response = await request(app)
        .post('/api/armies/import')
        .send({ armyForgeId: 'invalid-id-12345' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Failed to fetch army from ArmyForge');
    });
  });

  describe('GET /api/armies', () => {
    beforeEach(async () => {
      // Import a test army for retrieval tests
      await request(app)
        .post('/api/armies/import')
        .send({ armyForgeId: 'IJ1JM_m-jmka' });
    });

    it('should return list of stored armies', async () => {
      const response = await request(app)
        .get('/api/armies')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.armies).toBeDefined();
      expect(response.body.armies).toHaveLength(1);
      expect(response.body.armies[0].name).toBe("Dev Testerson's Bullshit Army");
      expect(response.body.armies[0].list_points).toBe(3080);
    });

    it('should return empty array when no armies stored', async () => {
      await db.run('DELETE FROM armies');
      
      const response = await request(app)
        .get('/api/armies')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.armies).toHaveLength(0);
    });
  });

  describe('GET /api/armies/:id', () => {
    let armyId: number;

    beforeEach(async () => {
      // Import a test army and get its ID
      await request(app)
        .post('/api/armies/import')
        .send({ armyForgeId: 'IJ1JM_m-jmka' });

      const armies = await db.all('SELECT id FROM armies LIMIT 1');
      armyId = armies[0].id;
    });

    it('should return stored army by ID with full details', async () => {
      const response = await request(app)
        .get(`/api/armies/${armyId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.army).toBeDefined();
      expect(response.body.army.name).toBe("Dev Testerson's Bullshit Army");
      expect(response.body.army.units).toBeDefined();
      expect(response.body.army.units).toHaveLength(8);
      
      // Verify unit structure
      const firstUnit = response.body.army.units[0];
      expect(firstUnit.sub_units).toBeDefined();
      expect(firstUnit.sub_units[0].models).toBeDefined();
    });

    it('should return 400 for invalid army ID', async () => {
      const response = await request(app)
        .get('/api/armies/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid army ID');
    });

    it('should return 404 for non-existent army ID', async () => {
      const response = await request(app)
        .get('/api/armies/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Army not found');
    });
  });

  describe('Army storage and retrieval consistency', () => {
    it('should maintain data consistency between import and retrieval', async () => {
      // Import army
      const importResponse = await request(app)
        .post('/api/armies/import')
        .send({ armyForgeId: 'IJ1JM_m-jmka' })
        .expect(200);

      const originalArmy = importResponse.body.army;

      // Get army ID
      const armies = await db.all('SELECT id FROM armies LIMIT 1');
      const armyId = armies[0].id;

      // Retrieve army
      const retrieveResponse = await request(app)
        .get(`/api/armies/${armyId}`)
        .expect(200);

      const retrievedArmy = retrieveResponse.body.army;

      // Compare key properties
      expect(retrievedArmy.name).toBe(originalArmy.name);
      expect(retrievedArmy.list_points).toBe(originalArmy.list_points);
      expect(retrievedArmy.model_count).toBe(originalArmy.model_count);
      expect(retrievedArmy.activation_count).toBe(originalArmy.activation_count);
      expect(retrievedArmy.units).toHaveLength(originalArmy.units.length);

      // Compare first unit details
      expect(retrievedArmy.units[0].name).toBe(originalArmy.units[0].name);
      expect(retrievedArmy.units[0].total_cost).toBe(originalArmy.units[0].total_cost);
      expect(retrievedArmy.units[0].model_count).toBe(originalArmy.units[0].model_count);
    });
  });
});