import request from 'supertest';
import { Server } from 'http';
import { app, startServer } from '../src/server';

describe('Unit Battle State API', () => {
  let server: Server;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('POST /api/battles/:id/start', () => {
    test('should start a battle and initialize unit states', async () => {
      // First create a battle
      const battleData = {
        name: 'Unit State Test Battle',
        description: 'Battle for testing unit state initialization',
        mission_type: 'skirmish',
        has_command_points: true,
        command_point_mode: 'fixed',
        points_limit: 2000
      };

      const battleResponse = await request(app)
        .post('/api/battles')
        .send(battleData)
        .expect(201);

      const battleId = battleResponse.body.battle.id;

      // Import two different armies
      await request(app)
        .post('/api/armies/import')
        .send({ armyForgeId: 'IJ1JM_m-jmka' })
        .expect(200);

      await request(app)
        .post('/api/armies/import')
        .send({ armyForgeId: 'vMzljLVC6ZGv' })
        .expect(200);

      // Get the armies from the database
      const armiesResponse = await request(app)
        .get('/api/armies')
        .expect(200);
      
      const armies = armiesResponse.body.armies;

      // Add participants with different armies
      await request(app)
        .post(`/api/battles/${battleId}/participants`)
        .send({
          army_id: armies[0].id,
          player_name: 'Player 1',
          doctrine: 'aggressive'
        })
        .expect(201);

      await request(app)
        .post(`/api/battles/${battleId}/participants`)
        .send({
          army_id: armies[1].id,
          player_name: 'Player 2',
          doctrine: 'defensive'
        })
        .expect(201);

      // Start the battle
      const startResponse = await request(app)
        .post(`/api/battles/${battleId}/start`)
        .send({})
        .expect(200);

      expect(startResponse.body.success).toBe(true);
      expect(startResponse.body.battle).toBeDefined();
      expect(startResponse.body.battle.status).toBe('deployment');
      expect(startResponse.body.unit_states).toBeDefined();
      expect(Array.isArray(startResponse.body.unit_states)).toBe(true);
      expect(startResponse.body.unit_states.length).toBeGreaterThan(0);

      // Check unit state properties
      const unitState = startResponse.body.unit_states[0];
      expect(unitState).toHaveProperty('id');
      expect(unitState).toHaveProperty('battle_id');
      expect(unitState).toHaveProperty('army_id');
      expect(unitState).toHaveProperty('unit_path');
      expect(unitState).toHaveProperty('current_health');
      expect(unitState).toHaveProperty('max_health');
      expect(unitState).toHaveProperty('status');
      expect(unitState).toHaveProperty('is_fatigued');
      expect(unitState).toHaveProperty('spell_tokens');
      expect(unitState).toHaveProperty('activated_this_round');
      expect(unitState).toHaveProperty('participated_in_melee');
      expect(unitState).toHaveProperty('deployment_status');

      // Verify initial values
      expect(unitState.status).toBe('normal');
      expect(unitState.is_fatigued).toBe(false);
      expect(unitState.spell_tokens).toBe(0);
      expect(unitState.activated_this_round).toBe(false);
      expect(unitState.participated_in_melee).toBe(false);
      expect(unitState.deployment_status).toBe('standard');
      expect(unitState.current_health).toBe(unitState.max_health);
    });

    test('should fail to start battle with invalid ID', async () => {
      const response = await request(app)
        .post('/api/battles/invalid/start')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid battle ID');
    });

    test('should fail to start non-existent battle', async () => {
      const response = await request(app)
        .post('/api/battles/99999/start')
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Battle not found');
    });

    test('should fail to start battle without enough participants', async () => {
      // Create battle with only one participant
      const battleData = {
        name: 'Insufficient Participants Battle',
        description: 'Battle with only one participant'
      };

      const battleResponse = await request(app)
        .post('/api/battles')
        .send(battleData)
        .expect(201);

      const battleId = battleResponse.body.battle.id;

      // Import army  
      await request(app)
        .post('/api/armies/import')
        .send({ armyForgeId: 'IJ1JM_m-jmka' })
        .expect(200);

      // Get the army from the database to get correct ID
      const armiesResponse = await request(app)
        .get('/api/armies')
        .expect(200);
      
      const army = armiesResponse.body.armies[0];

      await request(app)
        .post(`/api/battles/${battleId}/participants`)
        .send({
          army_id: army.id,
          player_name: 'Lonely Player'
        })
        .expect(201);

      // Try to start battle
      const response = await request(app)
        .post(`/api/battles/${battleId}/start`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Battle must have at least 2 participants to start');
    });

    test('should fail to start battle that is not in setup phase', async () => {
      // Create and start a battle first
      const battleData = {
        name: 'Already Started Battle',
        description: 'Battle that will be started already'
      };

      const battleResponse = await request(app)
        .post('/api/battles')
        .send(battleData)
        .expect(201);

      const battleId = battleResponse.body.battle.id;

      // Import two different armies
      await request(app)
        .post('/api/armies/import')
        .send({ armyForgeId: 'IJ1JM_m-jmka' })
        .expect(200);

      await request(app)
        .post('/api/armies/import')
        .send({ armyForgeId: 'vMzljLVC6ZGv' })
        .expect(200);

      // Get the armies from the database
      const armiesResponse = await request(app)
        .get('/api/armies')
        .expect(200);
      
      const armies = armiesResponse.body.armies;

      await request(app)
        .post(`/api/battles/${battleId}/participants`)
        .send({
          army_id: armies[0].id,
          player_name: 'Player 1'
        })
        .expect(201);

      await request(app)
        .post(`/api/battles/${battleId}/participants`)
        .send({
          army_id: armies[1].id,
          player_name: 'Player 2'
        })
        .expect(201);

      await request(app)
        .post(`/api/battles/${battleId}/start`)
        .send({})
        .expect(200);

      // Try to start again
      const response = await request(app)
        .post(`/api/battles/${battleId}/start`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Battle can only be started from setup phase');
    });
  });

  describe('GET /api/battles/:id/units', () => {
    test('should get unit states for a battle', async () => {
      // Create and start a battle with unit states
      const battleData = {
        name: 'Get Unit States Battle',
        description: 'Battle for testing unit state retrieval'
      };

      const battleResponse = await request(app)
        .post('/api/battles')
        .send(battleData)
        .expect(201);

      const battleId = battleResponse.body.battle.id;

      // Import two different armies
      await request(app)
        .post('/api/armies/import')
        .send({ armyForgeId: 'IJ1JM_m-jmka' })
        .expect(200);

      await request(app)
        .post('/api/armies/import')
        .send({ armyForgeId: 'vMzljLVC6ZGv' })
        .expect(200);

      // Get the armies from the database
      const armiesResponse = await request(app)
        .get('/api/armies')
        .expect(200);
      
      const armies = armiesResponse.body.armies;

      await request(app)
        .post(`/api/battles/${battleId}/participants`)
        .send({
          army_id: armies[0].id,
          player_name: 'Player 1'
        })
        .expect(201);

      await request(app)
        .post(`/api/battles/${battleId}/participants`)
        .send({
          army_id: armies[1].id,
          player_name: 'Player 2'
        })
        .expect(201);

      // Start battle to initialize unit states
      await request(app)
        .post(`/api/battles/${battleId}/start`)
        .send({})
        .expect(200);

      // Get unit states
      const response = await request(app)
        .get(`/api/battles/${battleId}/units`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.unit_states).toBeDefined();
      expect(Array.isArray(response.body.unit_states)).toBe(true);
      expect(response.body.unit_states.length).toBeGreaterThan(0);

      // Check unit states are ordered by army_id and unit_path
      const unitStates = response.body.unit_states;
      for (let i = 1; i < unitStates.length; i++) {
        const current = unitStates[i];
        const previous = unitStates[i - 1];
        
        if (current.army_id === previous.army_id) {
          expect(current.unit_path >= previous.unit_path).toBe(true);
        } else {
          expect(current.army_id >= previous.army_id).toBe(true);
        }
      }
    });

    test('should return empty array for battle with no unit states', async () => {
      // Create battle but don't start it
      const battleData = {
        name: 'No Unit States Battle',
        description: 'Battle without unit states'
      };

      const battleResponse = await request(app)
        .post('/api/battles')
        .send(battleData)
        .expect(201);

      const battleId = battleResponse.body.battle.id;

      const response = await request(app)
        .get(`/api/battles/${battleId}/units`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.unit_states).toEqual([]);
    });

    test('should fail with invalid battle ID', async () => {
      const response = await request(app)
        .get('/api/battles/invalid/units')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid battle ID');
    });
  });

  describe('PATCH /api/battles/:battleId/units/:unitStateId', () => {
    let battleId: number;
    let unitStateId: number;

    beforeEach(async () => {
      // Create and start a battle for each test
      const battleData = {
        name: `Unit State Update Battle ${Date.now()}`,
        description: 'Battle for testing unit state updates'
      };

      const battleResponse = await request(app)
        .post('/api/battles')
        .send(battleData)
        .expect(201);

      battleId = battleResponse.body.battle.id;

      // Import two different armies
      await request(app)
        .post('/api/armies/import')
        .send({ armyForgeId: 'IJ1JM_m-jmka' })
        .expect(200);

      await request(app)
        .post('/api/armies/import')
        .send({ armyForgeId: 'vMzljLVC6ZGv' })
        .expect(200);

      // Get the armies from the database
      const armiesResponse = await request(app)
        .get('/api/armies')
        .expect(200);
      
      const armies = armiesResponse.body.armies;

      await request(app)
        .post(`/api/battles/${battleId}/participants`)
        .send({
          army_id: armies[0].id,
          player_name: 'Player 1'
        })
        .expect(201);

      await request(app)
        .post(`/api/battles/${battleId}/participants`)
        .send({
          army_id: armies[1].id,
          player_name: 'Player 2'
        })
        .expect(201);

      // Start battle and get first unit state ID
      const startResponse = await request(app)
        .post(`/api/battles/${battleId}/start`)
        .send({})
        .expect(200);

      unitStateId = startResponse.body.unit_states[0].id;
    });

    test('should update unit health', async () => {
      const updateData = {
        current_health: 5
      };

      const response = await request(app)
        .patch(`/api/battles/${battleId}/units/${unitStateId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.unit_state).toBeDefined();
      expect(response.body.unit_state.current_health).toBe(5);
    });

    test('should update unit status', async () => {
      const updateData = {
        status: 'shaken'
      };

      const response = await request(app)
        .patch(`/api/battles/${battleId}/units/${unitStateId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.unit_state.status).toBe('shaken');
    });

    test('should update fatigue status', async () => {
      const updateData = {
        is_fatigued: true
      };

      const response = await request(app)
        .patch(`/api/battles/${battleId}/units/${unitStateId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.unit_state.is_fatigued).toBe(true);
    });

    test('should update spell tokens', async () => {
      const updateData = {
        spell_tokens: 3
      };

      const response = await request(app)
        .patch(`/api/battles/${battleId}/units/${unitStateId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.unit_state.spell_tokens).toBe(3);
    });

    test('should update activation status', async () => {
      const updateData = {
        activated_this_round: true
      };

      const response = await request(app)
        .patch(`/api/battles/${battleId}/units/${unitStateId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.unit_state.activated_this_round).toBe(true);
    });

    test('should update melee participation', async () => {
      const updateData = {
        participated_in_melee: true
      };

      const response = await request(app)
        .patch(`/api/battles/${battleId}/units/${unitStateId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.unit_state.participated_in_melee).toBe(true);
    });

    test('should update deployment status', async () => {
      const updateData = {
        deployment_status: 'ambush'
      };

      const response = await request(app)
        .patch(`/api/battles/${battleId}/units/${unitStateId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.unit_state.deployment_status).toBe('ambush');
    });

    test('should update current action', async () => {
      const updateData = {
        current_action: 'charge'
      };

      const response = await request(app)
        .patch(`/api/battles/${battleId}/units/${unitStateId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.unit_state.current_action).toBe('charge');
    });

    test('should update position data', async () => {
      const updateData = {
        position_data: {
          x: 10,
          y: 15,
          facing: 'north'
        }
      };

      const response = await request(app)
        .patch(`/api/battles/${battleId}/units/${unitStateId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.unit_state.position_data).toEqual(updateData.position_data);
    });

    test('should update status effects', async () => {
      const updateData = {
        status_effects: ['poison', 'stunned']
      };

      const response = await request(app)
        .patch(`/api/battles/${battleId}/units/${unitStateId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.unit_state.status_effects).toEqual(updateData.status_effects);
    });

    test('should update multiple fields simultaneously', async () => {
      const updateData = {
        current_health: 3,
        status: 'shaken',
        is_fatigued: true,
        spell_tokens: 2,
        current_action: 'advance'
      };

      const response = await request(app)
        .patch(`/api/battles/${battleId}/units/${unitStateId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.unit_state.current_health).toBe(3);
      expect(response.body.unit_state.status).toBe('shaken');
      expect(response.body.unit_state.is_fatigued).toBe(true);
      expect(response.body.unit_state.spell_tokens).toBe(2);
      expect(response.body.unit_state.current_action).toBe('advance');
    });

    test('should fail with invalid battle ID', async () => {
      const response = await request(app)
        .patch(`/api/battles/invalid/units/${unitStateId}`)
        .send({ current_health: 5 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid battle ID or unit state ID');
    });

    test('should fail with invalid unit state ID', async () => {
      const response = await request(app)
        .patch(`/api/battles/${battleId}/units/invalid`)
        .send({ current_health: 5 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid battle ID or unit state ID');
    });

    test('should fail with non-existent unit state', async () => {
      const response = await request(app)
        .patch(`/api/battles/${battleId}/units/99999`)
        .send({ current_health: 5 })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unit state not found');
    });

    test('should fail with empty update request', async () => {
      const response = await request(app)
        .patch(`/api/battles/${battleId}/units/${unitStateId}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No valid fields provided for update');
    });
  });
});