import { NewArmyProcessor } from '../src/services/newArmyProcessor';

describe('NewArmyProcessor - Basic Tests', () => {
  test('should create new processor instance', () => {
    expect(NewArmyProcessor).toBeDefined();
  });

  test('should process empty army', () => {
    const mockArmy = {
      id: 'test-army',
      name: 'Test Army',
      description: 'Test',
      pointsLimit: 1000,
      listPoints: 0,
      modelCount: 0,
      activationCount: 0,
      gameSystem: 'gf',
      campaignMode: false,
      isCloud: false,
      forceOrg: true,
      modified: '2025-01-01T00:00:00.000Z',
      cloudModified: '2025-01-01T00:00:00.000Z',
      narrativeMode: false,
      units: [],
      forceOrgErrors: []
    };

    const result = NewArmyProcessor.processArmy(mockArmy);
    
    expect(result).toBeDefined();
    expect(result.id).toBe('');
    expect(result.armyforge_id).toBe('test-army');
    expect(result.name).toBe('Test Army');
    expect(result.units).toHaveLength(0);
    expect(result.list_points).toBe(0);
    expect(result.model_count).toBe(0);
  });
});