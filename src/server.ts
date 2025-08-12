import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { Server } from 'http';
import { db } from './database/db';
import { NewArmyProcessor } from './services/newArmyProcessor';
import { 
  ProcessedArmy, 
  ProcessedRule, 
  Battle, 
  BattleParticipant, 
  CreateBattleRequest, 
  AddParticipantRequest,
  BattleStatus,
  UnitBattleState,
  UnitStatus,
  DeploymentStatus,
  UnitAction
} from './types/internal';
import { ArmyForgeArmy } from './types/armyforge';

const app = express();
const PORT = process.env.PORT || 4019;

app.use(cors());
app.use(express.json());

interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}

interface ApiInfoResponse {
  message: string;
  version: string;
}

interface ImportArmyRequest {
  armyForgeId: string;
}

interface ImportArmyResponse {
  success: boolean;
  army?: ProcessedArmy;
  error?: string;
}

interface GetArmiesResponse {
  success: boolean;
  armies?: StoredArmySummary[];
  error?: string;
}

interface GetArmyResponse {
  success: boolean;
  army?: ProcessedArmy;
  error?: string;
}

interface CreateBattleResponse {
  success: boolean;
  battle?: Battle;
  error?: string;
}

interface GetBattlesResponse {
  success: boolean;
  battles?: Battle[];
  error?: string;
}

interface GetBattleResponse {
  success: boolean;
  battle?: Battle;
  participants?: BattleParticipant[];
  error?: string;
}

interface AddParticipantResponse {
  success: boolean;
  participant?: BattleParticipant;
  error?: string;
}

interface StartBattleRequest {
  battle_id: number;
}

interface StartBattleResponse {
  success: boolean;
  battle?: Battle;
  unit_states?: UnitBattleState[];
  error?: string;
}

interface UpdateUnitStateRequest {
  current_health?: number;
  status?: UnitStatus;
  is_fatigued?: boolean;
  spell_tokens?: number;
  activated_this_round?: boolean;
  participated_in_melee?: boolean;
  position_data?: Record<string, any>;
  deployment_status?: DeploymentStatus;
  current_action?: UnitAction;
  status_effects?: string[];
}

interface UpdateUnitStateResponse {
  success: boolean;
  unit_state?: UnitBattleState;
  error?: string;
}

interface GetUnitStatesResponse {
  success: boolean;
  unit_states?: UnitBattleState[];
  error?: string;
}

interface StoredArmySummary {
  id: number;
  armyforge_id: string;
  name: string;
  description?: string;
  validation_errors?: string; // JSON string in database
  points_limit: number;
  list_points: number;
  model_count: number;
  activation_count: number;
  created_at: string;
  updated_at: string;
}

app.get('/health', (_req: Request, res: Response<HealthResponse>) => {
  res.json({ 
    status: 'ok', 
    version: '2.11.1',
    timestamp: new Date().toISOString()
  });
});

// API Root endpoint (only in non-production mode)
if (process.env.NODE_ENV !== 'production') {
  app.get('/', (_req: Request, res: Response<ApiInfoResponse>) => {
    res.json({ 
      message: 'BattleSync v2 API',
      version: '2.11.1'
    });
  });
}

app.post('/api/armies/import', async (req: Request<{}, ImportArmyResponse, ImportArmyRequest>, res: Response<ImportArmyResponse>) => {
  try {
    const { armyForgeId } = req.body;
    
    if (!armyForgeId) {
      res.status(400).json({
        success: false,
        error: 'armyForgeId is required'
      });
      return;
    }

    // Fetch army data from ArmyForge API
    const armyForgeUrl = `https://army-forge.onepagerules.com/api/tts?id=${armyForgeId}`;
    const response = await fetch(armyForgeUrl);
    
    if (!response.ok) {
      res.status(404).json({
        success: false,
        error: `Failed to fetch army from ArmyForge: ${response.status}`
      });
      return;
    }

    const armyForgeData = await response.json() as ArmyForgeArmy;
    
    // Process army using our ArmyProcessor
    const processedArmy = NewArmyProcessor.processArmy(armyForgeData);
    
    // Store in database  
    const storedArmyId = await storeArmyInDatabase(processedArmy, armyForgeData);
    
    // Get the actual army from database to ensure we have the correct ID
    const storedArmy = await db.get(`SELECT id FROM armies WHERE armyforge_id = ?`, [processedArmy.armyforge_id]);
    processedArmy.id = storedArmy.id.toString();
    
    res.json({
      success: true,
      army: processedArmy
    });
    
  } catch (error) {
    console.error('Error importing army:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while importing army'
    });
  }
});

app.get('/api/armies', async (_req: Request, res: Response<GetArmiesResponse>) => {
  try {
    const armies = await db.all<StoredArmySummary>(`
      SELECT id, armyforge_id, name, description, validation_errors, points_limit, list_points, 
             model_count, activation_count, created_at, updated_at
      FROM armies 
      ORDER BY updated_at DESC
    `);

    // Parse validation_errors from JSON string to array
    const armiesWithParsedValidation = armies.map(army => ({
      ...army,
      validation_errors: JSON.parse(army.validation_errors || '[]')
    }));

    res.json({
      success: true,
      armies: armiesWithParsedValidation
    });
    
  } catch (error) {
    console.error('Error fetching armies:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching armies'
    });
  }
});

app.get('/api/armies/:id', async (req: Request<{id: string}>, res: Response<GetArmyResponse>) => {
  try {
    const armyId = parseInt(req.params.id, 10);
    
    if (isNaN(armyId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid army ID'
      });
      return;
    }

    // Get army basic info
    const army = await db.get(`
      SELECT id, armyforge_id, name, description, validation_errors, points_limit, list_points, 
             model_count, activation_count, game_system, campaign_mode, raw_armyforge_data
      FROM armies WHERE id = ?
    `, [armyId]);

    if (!army) {
      res.status(404).json({
        success: false,
        error: 'Army not found'
      });
      return;
    }

    // Rebuild the ProcessedArmy from database
    const processedArmy = await buildProcessedArmyFromDatabase(armyId, army);

    res.json({
      success: true,
      army: processedArmy
    });
    
  } catch (error) {
    console.error('Error fetching army:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching army'
    });
  }
});

// Delete army by ID
app.delete('/api/armies/:id', async (req: Request<{id: string}>, res: Response) => {
  try {
    const armyId = parseInt(req.params.id, 10);
    
    if (isNaN(armyId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid army ID'
      });
      return;
    }

    // Check if army exists
    const army = await db.get('SELECT id FROM armies WHERE id = ?', [armyId]);
    
    if (!army) {
      res.status(404).json({
        success: false,
        error: 'Army not found'
      });
      return;
    }

    // Delete army and related data
    await db.run('DELETE FROM army_units WHERE army_id = ?', [armyId]);
    await db.run('DELETE FROM armies WHERE id = ?', [armyId]);

    res.json({
      success: true,
      message: 'Army deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting army:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while deleting army'
    });
  }
});

// Battle Management Endpoints

// Create new battle
app.post('/api/battles', async (req: Request<{}, CreateBattleResponse, CreateBattleRequest>, res: Response<CreateBattleResponse>) => {
  try {
    const {
      name,
      description,
      mission_type = 'skirmish',
      game_system = 'grimdark-future',
      points_limit,
      has_command_points = false,
      command_point_mode = 'fixed',
      has_underdog_bonus = false,
      is_campaign_battle = false
    } = req.body;

    if (!name?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Battle name is required'
      });
      return;
    }

    const result = await db.run(`
      INSERT INTO battles (
        name, description, mission_type, game_system, points_limit,
        has_command_points, command_point_mode, has_underdog_bonus, is_campaign_battle
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name.trim(),
      description?.trim() || null,
      mission_type,
      game_system,
      points_limit || null,
      has_command_points,
      command_point_mode,
      has_underdog_bonus,
      is_campaign_battle
    ]);

    if (!result.lastID) {
      throw new Error('Failed to create battle');
    }

    const battle = await db.get(`
      SELECT * FROM battles WHERE id = ?
    `, [result.lastID]);

    const formattedBattle: Battle = {
      ...battle,
      turn_sequence: battle.turn_sequence ? JSON.parse(battle.turn_sequence) : undefined,
      mission_data: battle.mission_data ? JSON.parse(battle.mission_data) : undefined,
      command_points: battle.command_points ? JSON.parse(battle.command_points) : undefined
    };

    res.status(201).json({
      success: true,
      battle: formattedBattle
    });

  } catch (error) {
    console.error('Error creating battle:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while creating battle'
    });
  }
});

// Get all battles
app.get('/api/battles', async (_req: Request, res: Response<GetBattlesResponse>) => {
  try {
    const battles = await db.all(`
      SELECT * FROM battles ORDER BY created_at DESC
    `);

    const formattedBattles: Battle[] = battles.map((battle: any) => ({
      ...battle,
      turn_sequence: battle.turn_sequence ? JSON.parse(battle.turn_sequence) : undefined,
      mission_data: battle.mission_data ? JSON.parse(battle.mission_data) : undefined,
      command_points: battle.command_points ? JSON.parse(battle.command_points) : undefined
    }));

    res.json({
      success: true,
      battles: formattedBattles
    });

  } catch (error) {
    console.error('Error fetching battles:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching battles'
    });
  }
});

// Get specific battle with participants
app.get('/api/battles/:id', async (req: Request<{id: string}>, res: Response<GetBattleResponse>) => {
  try {
    const battleId = parseInt(req.params.id, 10);
    
    if (isNaN(battleId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid battle ID'
      });
      return;
    }

    const battle = await db.get(`
      SELECT * FROM battles WHERE id = ?
    `, [battleId]);

    if (!battle) {
      res.status(404).json({
        success: false,
        error: 'Battle not found'
      });
      return;
    }

    const participants = await db.all(`
      SELECT * FROM battle_participants WHERE battle_id = ? ORDER BY turn_order, id
    `, [battleId]);

    const formattedBattle: Battle = {
      ...battle,
      turn_sequence: battle.turn_sequence ? JSON.parse(battle.turn_sequence) : undefined,
      mission_data: battle.mission_data ? JSON.parse(battle.mission_data) : undefined,
      command_points: battle.command_points ? JSON.parse(battle.command_points) : undefined
    };

    const formattedParticipants: BattleParticipant[] = participants.map((participant: any) => ({
      ...participant,
      deployment_zone: participant.deployment_zone ? JSON.parse(participant.deployment_zone) : undefined
    }));

    res.json({
      success: true,
      battle: formattedBattle,
      participants: formattedParticipants
    });

  } catch (error) {
    console.error('Error fetching battle:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching battle'
    });
  }
});

// Add participant to battle
app.post('/api/battles/:id/participants', async (req: Request<{id: string}, AddParticipantResponse, AddParticipantRequest>, res: Response<AddParticipantResponse>) => {
  try {
    const battleId = parseInt(req.params.id, 10);
    const { army_id, player_name, doctrine } = req.body;
    
    if (isNaN(battleId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid battle ID'
      });
      return;
    }

    if (!player_name?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Player name is required'
      });
      return;
    }

    // Verify battle exists and is in setup phase
    const battle = await db.get(`
      SELECT status FROM battles WHERE id = ?
    `, [battleId]);

    if (!battle) {
      res.status(404).json({
        success: false,
        error: 'Battle not found'
      });
      return;
    }

    if (battle.status !== 'setup') {
      res.status(400).json({
        success: false,
        error: 'Cannot add participants to battle that is not in setup phase'
      });
      return;
    }

    // Verify army exists
    const army = await db.get(`
      SELECT id FROM armies WHERE id = ?
    `, [army_id]);

    if (!army) {
      res.status(400).json({
        success: false,
        error: 'Army not found'
      });
      return;
    }

    // Check if army already participating
    const existingParticipant = await db.get(`
      SELECT id FROM battle_participants WHERE battle_id = ? AND army_id = ?
    `, [battleId, army_id]);

    if (existingParticipant) {
      res.status(400).json({
        success: false,
        error: 'Army is already participating in this battle'
      });
      return;
    }

    const result = await db.run(`
      INSERT INTO battle_participants (battle_id, army_id, player_name, doctrine)
      VALUES (?, ?, ?, ?)
    `, [battleId, army_id, player_name.trim(), doctrine?.trim() || null]);

    if (!result.lastID) {
      throw new Error('Failed to add participant');
    }

    const participant = await db.get(`
      SELECT * FROM battle_participants WHERE id = ?
    `, [result.lastID]);

    const formattedParticipant: BattleParticipant = {
      ...participant,
      deployment_zone: participant.deployment_zone ? JSON.parse(participant.deployment_zone) : undefined
    };

    res.status(201).json({
      success: true,
      participant: formattedParticipant
    });

  } catch (error) {
    console.error('Error adding participant:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while adding participant'
    });
  }
});

// Start battle and initialize unit states
app.post('/api/battles/:id/start', async (req: Request<{id: string}, StartBattleResponse, StartBattleRequest>, res: Response<StartBattleResponse>) => {
  try {
    const battleId = parseInt(req.params.id, 10);
    
    if (isNaN(battleId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid battle ID'
      });
      return;
    }

    // Verify battle exists and is in setup phase
    const battle = await db.get(`
      SELECT * FROM battles WHERE id = ?
    `, [battleId]);

    if (!battle) {
      res.status(404).json({
        success: false,
        error: 'Battle not found'
      });
      return;
    }

    if (battle.status !== 'setup') {
      res.status(400).json({
        success: false,
        error: 'Battle can only be started from setup phase'
      });
      return;
    }

    // Get all participants
    const participants = await db.all(`
      SELECT * FROM battle_participants WHERE battle_id = ?
    `, [battleId]);

    if (participants.length < 2) {
      res.status(400).json({
        success: false,
        error: 'Battle must have at least 2 participants to start'
      });
      return;
    }

    // Initialize unit states for all participating armies
    const unitStates: UnitBattleState[] = [];
    
    for (const participant of participants) {
      // Get army details to extract all units
      const processedArmy = await getProcessedArmyById(participant.army_id);
      
      if (!processedArmy) {
        continue; // Skip if army not found
      }

      // Create unit battle states for each unit in the army
      for (let unitIndex = 0; unitIndex < processedArmy.units.length; unitIndex++) {
        const unit = processedArmy.units[unitIndex];
        if (!unit) continue;
        
        const unitPath = `units.${unitIndex}`;
        
        // Calculate total health for the unit (sum of all model health)
        let totalMaxHealth = 0;
        if (unit.sub_units) {
          for (const subUnit of unit.sub_units) {
            if (subUnit.models) {
              for (const model of subUnit.models) {
                totalMaxHealth += model.max_tough;
              }
            }
          }
        }

        const result = await db.run(`
          INSERT INTO unit_battle_state (
            battle_id, army_id, unit_path, current_health, max_health, 
            status, is_fatigued, spell_tokens, activated_this_round, 
            participated_in_melee, deployment_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          battleId,
          participant.army_id,
          unitPath,
          totalMaxHealth, // Start at full health
          totalMaxHealth,
          'normal',
          false,
          0,
          false,
          false,
          'standard'
        ]);

        if (result.lastID) {
          const unitState = await db.get(`
            SELECT * FROM unit_battle_state WHERE id = ?
          `, [result.lastID]);

          unitStates.push({
            ...unitState,
            is_fatigued: Boolean(unitState.is_fatigued),
            activated_this_round: Boolean(unitState.activated_this_round),
            participated_in_melee: Boolean(unitState.participated_in_melee),
            position_data: unitState.position_data ? JSON.parse(unitState.position_data) : undefined,
            status_effects: unitState.status_effects ? JSON.parse(unitState.status_effects) : undefined,
            kills_data: unitState.kills_data ? JSON.parse(unitState.kills_data) : undefined
          });
        }
      }
    }

    // Update battle status to deployment
    await db.run(`
      UPDATE battles SET status = 'deployment', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [battleId]);

    // Get updated battle
    const updatedBattle = await db.get(`
      SELECT * FROM battles WHERE id = ?
    `, [battleId]);

    const formattedBattle: Battle = {
      ...updatedBattle,
      turn_sequence: updatedBattle.turn_sequence ? JSON.parse(updatedBattle.turn_sequence) : undefined,
      mission_data: updatedBattle.mission_data ? JSON.parse(updatedBattle.mission_data) : undefined,
      command_points: updatedBattle.command_points ? JSON.parse(updatedBattle.command_points) : undefined
    };

    res.json({
      success: true,
      battle: formattedBattle,
      unit_states: unitStates
    });

  } catch (error) {
    console.error('Error starting battle:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while starting battle'
    });
  }
});

// Get unit states for a battle
app.get('/api/battles/:id/units', async (req: Request<{id: string}>, res: Response<GetUnitStatesResponse>) => {
  try {
    const battleId = parseInt(req.params.id, 10);
    
    if (isNaN(battleId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid battle ID'
      });
      return;
    }

    const unitStates = await db.all(`
      SELECT * FROM unit_battle_state WHERE battle_id = ? ORDER BY army_id, unit_path
    `, [battleId]);

    const formattedUnitStates: UnitBattleState[] = unitStates.map((state: any) => ({
      ...state,
      is_fatigued: Boolean(state.is_fatigued),
      activated_this_round: Boolean(state.activated_this_round),
      participated_in_melee: Boolean(state.participated_in_melee),
      position_data: state.position_data ? JSON.parse(state.position_data) : undefined,
      status_effects: state.status_effects ? JSON.parse(state.status_effects) : undefined,
      kills_data: state.kills_data ? JSON.parse(state.kills_data) : undefined
    }));

    res.json({
      success: true,
      unit_states: formattedUnitStates
    });

  } catch (error) {
    console.error('Error fetching unit states:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching unit states'
    });
  }
});

// Update unit state
app.patch('/api/battles/:battleId/units/:unitStateId', async (req: Request<{battleId: string, unitStateId: string}, UpdateUnitStateResponse, UpdateUnitStateRequest>, res: Response<UpdateUnitStateResponse>) => {
  try {
    const battleId = parseInt(req.params.battleId, 10);
    const unitStateId = parseInt(req.params.unitStateId, 10);
    
    if (isNaN(battleId) || isNaN(unitStateId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid battle ID or unit state ID'
      });
      return;
    }

    // Verify unit state exists and belongs to this battle
    const existingState = await db.get(`
      SELECT * FROM unit_battle_state WHERE id = ? AND battle_id = ?
    `, [unitStateId, battleId]);

    if (!existingState) {
      res.status(404).json({
        success: false,
        error: 'Unit state not found'
      });
      return;
    }

    // Build update query dynamically based on provided fields
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    
    const {
      current_health,
      status,
      is_fatigued,
      spell_tokens,
      activated_this_round,
      participated_in_melee,
      position_data,
      deployment_status,
      current_action,
      status_effects
    } = req.body;

    if (current_health !== undefined) {
      updateFields.push('current_health = ?');
      updateValues.push(current_health);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    if (is_fatigued !== undefined) {
      updateFields.push('is_fatigued = ?');
      updateValues.push(is_fatigued);
    }
    if (spell_tokens !== undefined) {
      updateFields.push('spell_tokens = ?');
      updateValues.push(spell_tokens);
    }
    if (activated_this_round !== undefined) {
      updateFields.push('activated_this_round = ?');
      updateValues.push(activated_this_round);
    }
    if (participated_in_melee !== undefined) {
      updateFields.push('participated_in_melee = ?');
      updateValues.push(participated_in_melee);
    }
    if (position_data !== undefined) {
      updateFields.push('position_data = ?');
      updateValues.push(JSON.stringify(position_data));
    }
    if (deployment_status !== undefined) {
      updateFields.push('deployment_status = ?');
      updateValues.push(deployment_status);
    }
    if (current_action !== undefined) {
      updateFields.push('current_action = ?');
      updateValues.push(current_action);
    }
    if (status_effects !== undefined) {
      updateFields.push('status_effects = ?');
      updateValues.push(JSON.stringify(status_effects));
    }

    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No valid fields provided for update'
      });
      return;
    }

    // Add updated timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(unitStateId);

    const updateQuery = `
      UPDATE unit_battle_state 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `;

    await db.run(updateQuery, updateValues);

    // Return updated unit state
    const updatedState = await db.get(`
      SELECT * FROM unit_battle_state WHERE id = ?
    `, [unitStateId]);

    const formattedUnitState: UnitBattleState = {
      ...updatedState,
      is_fatigued: Boolean(updatedState.is_fatigued),
      activated_this_round: Boolean(updatedState.activated_this_round),
      participated_in_melee: Boolean(updatedState.participated_in_melee),
      position_data: updatedState.position_data ? JSON.parse(updatedState.position_data) : undefined,
      status_effects: updatedState.status_effects ? JSON.parse(updatedState.status_effects) : undefined,
      kills_data: updatedState.kills_data ? JSON.parse(updatedState.kills_data) : undefined
    };

    res.json({
      success: true,
      unit_state: formattedUnitState
    });

  } catch (error) {
    console.error('Error updating unit state:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while updating unit state'
    });
  }
});

// Helper function to get processed army by ID
async function getProcessedArmyById(armyId: number): Promise<ProcessedArmy | null> {
  const armyRow = await db.get(`
    SELECT id, armyforge_id, name, description, validation_errors, points_limit, list_points, 
           model_count, activation_count, game_system, campaign_mode, raw_armyforge_data
    FROM armies WHERE id = ?
  `, [armyId]);

  if (!armyRow) {
    return null;
  }

  return await buildProcessedArmyFromDatabase(armyId, armyRow);
}

async function buildProcessedArmyFromDatabase(armyId: number, armyRow: any): Promise<ProcessedArmy> {
  // Get all units for this army
  const units = await db.all(`
    SELECT * FROM units WHERE army_id = ? ORDER BY id
  `, [armyId]);

  const processedUnits = [];
  
  for (const unit of units) {
    // Get sub-units for this unit
    const subUnits = await db.all(`
      SELECT * FROM sub_units WHERE unit_id = ? ORDER BY id
    `, [unit.id]);

    const processedSubUnits = [];
    
    for (const subUnit of subUnits) {
      // Get models for this sub-unit
      const models = await db.all(`
        SELECT * FROM models WHERE sub_unit_id = ? ORDER BY model_index
      `, [subUnit.id]);

      const processedModels = models.map((model: any) => ({
        model_id: model.id.toString(),
        name: model.name,
        custom_name: model.custom_name || undefined,
        max_tough: model.max_tough,
        current_tough: model.current_tough,
        is_hero: subUnit.is_hero,
        special_rules: JSON.parse(model.special_rules || '[]'),
        weapons: JSON.parse(model.weapons || '[]'),
        upgrades: JSON.parse(model.upgrades || '[]')
      }));

      processedSubUnits.push({
        id: subUnit.id.toString(),
        armyforge_unit_id: subUnit.armyforge_unit_id,
        name: subUnit.name,
        custom_name: subUnit.custom_name || undefined,
        quality: subUnit.quality,
        defense: subUnit.defense,
        size: subUnit.size,
        cost: subUnit.cost,
        is_hero: subUnit.is_hero,
        is_caster: subUnit.is_caster,
        caster_rating: subUnit.caster_rating || undefined,
        xp: subUnit.xp,
        traits: JSON.parse(subUnit.traits || '[]'),
        base_sizes: JSON.parse(subUnit.base_sizes || '{}'),
        weapons: JSON.parse(subUnit.weapons || '[]'),
        rules: JSON.parse(subUnit.rules || '[]'),
        items: JSON.parse(subUnit.items || '[]'),
        models: processedModels,
        notes: subUnit.notes || undefined
      });
    }

    processedUnits.push({
      id: unit.id.toString(),
      army_id: armyId.toString(),
      armyforge_unit_ids: JSON.parse(unit.armyforge_unit_ids || '[]'),
      name: unit.name,
      custom_name: unit.custom_name || undefined,
      quality: unit.quality,
      defense: unit.defense,
      total_cost: unit.total_cost,
      model_count: unit.model_count,
      is_combined: unit.is_combined,
      is_joined: unit.is_joined,
      has_hero: unit.has_hero,
      has_caster: unit.has_caster,
      sub_units: processedSubUnits,
      notes: unit.notes || undefined
    });
  }

  return {
    id: armyId.toString(),
    armyforge_id: armyRow.armyforge_id,
    name: armyRow.name,
    description: armyRow.description || undefined,
    validation_errors: JSON.parse(armyRow.validation_errors || '[]'),
    points_limit: armyRow.points_limit,
    list_points: armyRow.list_points,
    model_count: armyRow.model_count,
    activation_count: armyRow.activation_count,
    game_system: armyRow.game_system,
    campaign_mode: armyRow.campaign_mode,
    units: processedUnits,
    raw_armyforge_data: armyRow.raw_armyforge_data
  };
}

async function storeArmyInDatabase(processedArmy: ProcessedArmy, armyForgeData: ArmyForgeArmy): Promise<number> {
  try {
    // First, store the army
    const armyResult = await db.run(`
      INSERT OR REPLACE INTO armies (
        armyforge_id, name, description, validation_errors, points_limit, list_points, 
        model_count, activation_count, game_system, campaign_mode, raw_armyforge_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      processedArmy.armyforge_id,
      processedArmy.name,
      processedArmy.description || null,
      JSON.stringify(processedArmy.validation_errors || []),
      processedArmy.points_limit,
      processedArmy.list_points,
      processedArmy.model_count,
      processedArmy.activation_count,
      armyForgeData.gameSystem || 'gf',
      armyForgeData.campaignMode || false,
      JSON.stringify(armyForgeData)
    ]);

    const armyId = armyResult.lastID;
    if (!armyId) throw new Error('Failed to get army ID after insert');

    // Store all units
    for (const unit of processedArmy.units) {
      const unitResult = await db.run(`
        INSERT INTO units (
          army_id, armyforge_unit_ids, name, custom_name, total_cost, model_count,
          quality, defense, is_combined, is_joined, has_hero, has_caster, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        armyId,
        JSON.stringify(unit.armyforge_unit_ids),
        unit.name,
        unit.custom_name || null,
        unit.total_cost,
        unit.model_count,
        unit.quality,
        unit.defense,
        unit.is_combined,
        unit.is_joined,
        unit.has_hero,
        unit.has_caster,
        unit.notes || null
      ]);

      const unitId = unitResult.lastID;
      if (!unitId) throw new Error(`Failed to get unit ID after insert for unit: ${unit.name}`);

      // Store all sub-units
      for (const subUnit of unit.sub_units) {
        const subUnitResult = await db.run(`
          INSERT INTO sub_units (
            unit_id, armyforge_unit_id, name, custom_name, quality, defense, 
            size, cost, is_hero, is_caster, caster_rating, xp, traits,
            base_sizes, weapons, rules, items, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          unitId,
          subUnit.armyforge_unit_id,
          subUnit.name,
          subUnit.custom_name || null,
          subUnit.quality,
          subUnit.defense,
          subUnit.size,
          subUnit.cost,
          subUnit.is_hero,
          subUnit.is_caster,
          subUnit.caster_rating || null,
          subUnit.xp || 0,
          JSON.stringify(subUnit.traits || []),
          JSON.stringify(subUnit.base_sizes || {}),
          JSON.stringify(subUnit.weapons),
          JSON.stringify(subUnit.rules),
          JSON.stringify(subUnit.items || []),
          subUnit.notes || null
        ]);

        const subUnitId = subUnitResult.lastID;
        if (!subUnitId) throw new Error(`Failed to get sub-unit ID for: ${subUnit.name}`);

        // Store individual models (using processed models with weapons)
        for (let modelIndex = 0; modelIndex < subUnit.models.length; modelIndex++) {
          const model = subUnit.models[modelIndex];
          if (!model) continue;
          
          await db.run(`
            INSERT INTO models (
              sub_unit_id, model_index, name, custom_name, max_tough, current_tough, special_rules, weapons, upgrades
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            subUnitId,
            modelIndex,
            model.name,
            model.custom_name || null,
            model.max_tough,
            model.current_tough,
            JSON.stringify(model.special_rules),
            JSON.stringify(model.weapons),
            JSON.stringify(model.upgrades)
          ]);
        }
      }
    }

    console.log(`Successfully stored army: ${processedArmy.name} (ID: ${armyId})`);
    
    return armyId;
  } catch (error) {
    console.error('Error storing army in database:', error);
    throw error;
  }
}

// Serve static React build files in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from frontend build
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  
  // Handle client-side routing - send all non-API requests to React
  app.get(/^(?!\/api|\/health).*/, (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// Initialize database and start server
async function startServer(): Promise<Server> {
  try {
    await db.initialize();
    console.log('Database initialized successfully');
    
    const server: Server = app.listen(PORT, () => {
      console.log(`BattleSync v2 server running on port ${PORT}`);
    });
    
    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server unless in test environment
let server: Server | undefined;
if (process.env.NODE_ENV !== 'test') {
  startServer().then((s) => {
    server = s;
  });
}

export { app, server, startServer };