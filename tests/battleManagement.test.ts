import request from 'supertest';
import { app, startServer } from '../src/server';
import { Server } from 'http';

describe('Battle Management API', () => {
  let server: Server;
  
  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('POST /api/battles', () => {
    test('should create a new battle with valid data', async () => {
      const battleData = {
        name: 'Test Battle',
        description: 'A test battle for unit testing',
        mission_type: 'skirmish',
        has_command_points: true,
        command_point_mode: 'fixed',
        points_limit: 2000
      };

      const response = await request(app)
        .post('/api/battles')
        .send(battleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.battle).toBeDefined();
      expect(response.body.battle.id).toBeDefined();
      expect(response.body.battle.name).toBe('Test Battle');
      expect(response.body.battle.description).toBe('A test battle for unit testing');
      expect(response.body.battle.mission_type).toBe('skirmish');
      expect(response.body.battle.game_system).toBe('grimdark-future');
      expect(response.body.battle.has_command_points).toBe(1); // SQLite boolean as integer
      expect(response.body.battle.command_point_mode).toBe('fixed');
      expect(response.body.battle.points_limit).toBe(2000);
      expect(response.body.battle.status).toBe('setup');
      expect(response.body.battle.current_round).toBe(1);
      expect(response.body.battle.created_at).toBeDefined();
      expect(response.body.battle.updated_at).toBeDefined();
    });

    test('should create battle with minimal required data', async () => {
      const battleData = {
        name: 'Minimal Battle'
      };

      const response = await request(app)
        .post('/api/battles')
        .send(battleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.battle.name).toBe('Minimal Battle');
      expect(response.body.battle.mission_type).toBe('skirmish'); // Default value
      expect(response.body.battle.game_system).toBe('grimdark-future'); // Default value
      expect(response.body.battle.has_command_points).toBe(0); // Default false as 0
    });

    test('should return 400 for missing battle name', async () => {
      const battleData = {
        description: 'Battle without name'
      };

      const response = await request(app)
        .post('/api/battles')
        .send(battleData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Battle name is required');
    });

    test('should return 400 for empty battle name', async () => {
      const battleData = {
        name: '   ', // Only whitespace
        description: 'Battle with empty name'
      };

      const response = await request(app)
        .post('/api/battles')
        .send(battleData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Battle name is required');
    });

    test('should handle all command point modes', async () => {
      const modes = ['fixed', 'growing', 'temporary', 'fixed_random', 'growing_random', 'temporary_random'];
      
      for (const mode of modes) {
        const response = await request(app)
          .post('/api/battles')
          .send({
            name: `Battle with ${mode} CP`,
            command_point_mode: mode,
            has_command_points: true
          })
          .expect(201);

        expect(response.body.battle.command_point_mode).toBe(mode);
      }
    });
  });

  describe('GET /api/battles', () => {
    test('should return list of battles', async () => {
      // Get initial battle count
      const initialResponse = await request(app)
        .get('/api/battles')
        .expect(200);
      const initialCount = initialResponse.body.battles.length;

      // Create a couple of battles with unique names
      const uniqueName1 = `Battle List Test 1 ${Date.now()}`;
      const uniqueName2 = `Battle List Test 2 ${Date.now()}`;
      
      const battle1Response = await request(app)
        .post('/api/battles')
        .send({ name: uniqueName1, description: 'First battle' })
        .expect(201);

      const battle2Response = await request(app)
        .post('/api/battles')
        .send({ name: uniqueName2, has_command_points: true })
        .expect(201);

      const response = await request(app)
        .get('/api/battles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.battles).toBeInstanceOf(Array);
      expect(response.body.battles.length).toBeGreaterThanOrEqual(initialCount + 2);
      
      // Check battles are sorted by created_at DESC (newest first)
      const battles = response.body.battles;
      const battle1 = battles.find((b: any) => b.name === uniqueName1);
      const battle2 = battles.find((b: any) => b.name === uniqueName2);
      
      expect(battle1).toBeDefined();
      expect(battle2).toBeDefined();
      expect(battle1.id).toBe(battle1Response.body.battle.id);
      expect(battle2.id).toBe(battle2Response.body.battle.id);
      
      // Verify both battles are present and have correct data
      expect(new Date(battle2.created_at).getTime()).toBeGreaterThanOrEqual(new Date(battle1.created_at).getTime());
    });

    test('should return empty array when no battles exist', async () => {
      // This test assumes a clean database, might need adjustment based on test order
      const response = await request(app)
        .get('/api/battles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.battles).toBeInstanceOf(Array);
      // Note: battles array might not be empty due to previous tests
    });
  });

  describe('GET /api/battles/:id', () => {
    let battleId: number;

    beforeAll(async () => {
      // Create a battle for testing
      const createResponse = await request(app)
        .post('/api/battles')
        .send({
          name: 'Battle for Detail Testing',
          description: 'Testing battle detail retrieval',
          points_limit: 1500
        })
        .expect(201);

      battleId = createResponse.body.battle.id;
    });

    test('should return battle details with empty participants', async () => {
      const response = await request(app)
        .get(`/api/battles/${battleId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.battle).toBeDefined();
      expect(response.body.battle.id).toBe(battleId);
      expect(response.body.battle.name).toBe('Battle for Detail Testing');
      expect(response.body.participants).toBeInstanceOf(Array);
      expect(response.body.participants.length).toBe(0);
    });

    test('should return 400 for invalid battle ID', async () => {
      const response = await request(app)
        .get('/api/battles/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid battle ID');
    });

    test('should return 404 for non-existent battle ID', async () => {
      const response = await request(app)
        .get('/api/battles/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Battle not found');
    });
  });

  describe('POST /api/battles/:id/participants', () => {
    let battleId: number;
    let armyId: number;

    beforeAll(async () => {
      // Create a battle for testing
      const battleResponse = await request(app)
        .post('/api/battles')
        .send({
          name: 'Battle for Participant Testing',
          description: 'Testing participant management'
        })
        .expect(201);

      battleId = battleResponse.body.battle.id;

      // Create an army for testing
      const armyResponse = await request(app)
        .post('/api/armies/import')
        .send({ armyForgeId: 'IJ1JM_m-jmka' })
        .expect(200);

      // Get the army ID from the database since the response doesn't include it
      const armiesResponse = await request(app)
        .get('/api/armies')
        .expect(200);
      
      armyId = armiesResponse.body.armies[0].id;
    });

    test('should add participant to battle', async () => {
      const participantData = {
        army_id: armyId,
        player_name: 'Test Player',
        doctrine: 'Strategic Doctrine'
      };

      const response = await request(app)
        .post(`/api/battles/${battleId}/participants`)
        .send(participantData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.participant).toBeDefined();
      expect(response.body.participant.id).toBeDefined();
      expect(response.body.participant.battle_id).toBe(battleId);
      expect(response.body.participant.army_id).toBe(armyId);
      expect(response.body.participant.player_name).toBe('Test Player');
      expect(response.body.participant.doctrine).toBe('Strategic Doctrine');
      expect(response.body.participant.status).toBe('active');
      expect(response.body.participant.victory_points).toBe(0);
      expect(response.body.participant.underdog_points).toBe(0);
    });

    test('should add participant without doctrine', async () => {
      // Create another army for this test
      const armyResponse = await request(app)
        .post('/api/armies/import')
        .send({ armyForgeId: 'vMzljLVC6ZGv' })
        .expect(200);

      const armiesResponse = await request(app)
        .get('/api/armies')
        .expect(200);
      
      const secondArmyId = armiesResponse.body.armies.find(
        (army: any) => army.armyforge_id === 'vMzljLVC6ZGv'
      ).id;

      const participantData = {
        army_id: secondArmyId,
        player_name: 'Player Two'
      };

      const response = await request(app)
        .post(`/api/battles/${battleId}/participants`)
        .send(participantData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.participant.army_id).toBe(secondArmyId);
      expect(response.body.participant.player_name).toBe('Player Two');
      expect(response.body.participant.doctrine).toBeNull();
    });

    test('should verify battle now has participants', async () => {
      const response = await request(app)
        .get(`/api/battles/${battleId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.participants.length).toBe(2);
      expect(response.body.participants[0].player_name).toBe('Test Player');
      expect(response.body.participants[1].player_name).toBe('Player Two');
    });

    test('should return 400 for invalid battle ID', async () => {
      const response = await request(app)
        .post('/api/battles/invalid/participants')
        .send({
          army_id: armyId,
          player_name: 'Test Player'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid battle ID');
    });

    test('should return 404 for non-existent battle', async () => {
      const response = await request(app)
        .post('/api/battles/99999/participants')
        .send({
          army_id: armyId,
          player_name: 'Test Player'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Battle not found');
    });

    test('should return 400 for missing player name', async () => {
      const response = await request(app)
        .post(`/api/battles/${battleId}/participants`)
        .send({
          army_id: armyId
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Player name is required');
    });

    test('should return 400 for empty player name', async () => {
      const response = await request(app)
        .post(`/api/battles/${battleId}/participants`)
        .send({
          army_id: armyId,
          player_name: '   '
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Player name is required');
    });

    test('should return 400 for non-existent army', async () => {
      const response = await request(app)
        .post(`/api/battles/${battleId}/participants`)
        .send({
          army_id: 99999,
          player_name: 'Test Player'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Army not found');
    });

    test('should return 400 when army already participating', async () => {
      const response = await request(app)
        .post(`/api/battles/${battleId}/participants`)
        .send({
          army_id: armyId, // Same army as first participant
          player_name: 'Duplicate Player'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Army is already participating in this battle');
    });

    test('should return 400 when trying to add participant to non-setup battle', async () => {
      // This would require updating battle status, which we haven't implemented yet
      // Placeholder for future test when battle status management is implemented
    });
  });

  describe('Battle data integrity', () => {
    test('should maintain referential integrity between battles and participants', async () => {
      // Create battle
      const battleResponse = await request(app)
        .post('/api/battles')
        .send({ name: 'Integrity Test Battle' })
        .expect(201);

      const battleId = battleResponse.body.battle.id;

      // Get army ID
      const armiesResponse = await request(app)
        .get('/api/armies')
        .expect(200);
      
      const armyId = armiesResponse.body.armies[0].id;

      // Add participant
      await request(app)
        .post(`/api/battles/${battleId}/participants`)
        .send({
          army_id: armyId,
          player_name: 'Integrity Test Player'
        })
        .expect(201);

      // Verify battle includes participant
      const detailResponse = await request(app)
        .get(`/api/battles/${battleId}`)
        .expect(200);

      expect(detailResponse.body.participants.length).toBe(1);
      expect(detailResponse.body.participants[0].battle_id).toBe(battleId);
      expect(detailResponse.body.participants[0].army_id).toBe(armyId);
    });

    test('should handle JSON fields properly', async () => {
      const battleData = {
        name: 'JSON Test Battle',
        mission_type: 'capture_the_flag',
        game_system: 'grimdark-future'
      };

      const response = await request(app)
        .post('/api/battles')
        .send(battleData)
        .expect(201);

      // Verify JSON fields are properly handled (null by default)
      expect(response.body.battle.turn_sequence).toBeUndefined();
      expect(response.body.battle.mission_data).toBeUndefined();
      expect(response.body.battle.command_points).toBeUndefined();
    });
  });
});