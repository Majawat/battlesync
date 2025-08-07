import axios from 'axios';
import { ArmyProcessor } from './src/services/armyProcessor';
import { ArmyForgeArmy } from './src/types/armyforge';

async function testNaming() {
  const response = await axios.get<ArmyForgeArmy>('https://army-forge.onepagerules.com/api/tts?id=IJ1JM_m-jmka');
  const processed = ArmyProcessor.processArmy(response.data);
  
  console.log('=== UPDATED UNIT NAMES ===');
  processed.units.forEach((unit, index) => {
    console.log(`${index + 1}. ${unit.name} (${unit.is_combined ? 'Combined' : unit.is_joined ? 'Joined' : 'Regular'})`);
    console.log(`   Custom Name: ${unit.custom_name || 'None'}`);
    console.log(`   Cost: ${unit.total_cost} pts, Models: ${unit.model_count}`);
    
    unit.sub_units.forEach((subUnit, subIndex) => {
      console.log(`     Sub-unit ${subIndex + 1}: ${subUnit.custom_name || subUnit.name} (${subUnit.cost} pts)`);
    });
    console.log('');
  });
}

testNaming();