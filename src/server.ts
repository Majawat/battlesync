import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from 'http';
import { db } from './database/db';
import { ArmyProcessor } from './services/armyProcessor';
import { ProcessedArmy, ProcessedRule } from './types/internal';
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

interface StoredArmySummary {
  id: number;
  armyforge_id: string;
  name: string;
  description?: string;
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
    version: '2.7.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (_req: Request, res: Response<ApiInfoResponse>) => {
  res.json({ 
    message: 'BattleSync v2 API',
    version: '2.7.0'
  });
});

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
    const processedArmy = ArmyProcessor.processArmy(armyForgeData);
    
    // Store in database
    await storeArmyInDatabase(processedArmy, armyForgeData);
    
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
      SELECT id, armyforge_id, name, description, points_limit, list_points, 
             model_count, activation_count, created_at, updated_at
      FROM armies 
      ORDER BY updated_at DESC
    `);

    res.json({
      success: true,
      armies
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
      SELECT id, armyforge_id, name, description, points_limit, list_points, 
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

async function storeArmyInDatabase(processedArmy: ProcessedArmy, armyForgeData: ArmyForgeArmy): Promise<void> {
  try {
    // First, store the army
    const armyResult = await db.run(`
      INSERT OR REPLACE INTO armies (
        armyforge_id, name, description, points_limit, list_points, 
        model_count, activation_count, game_system, campaign_mode, raw_armyforge_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      processedArmy.armyforge_id,
      processedArmy.name,
      processedArmy.description || null,
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
    
  } catch (error) {
    console.error('Error storing army in database:', error);
    throw error;
  }
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