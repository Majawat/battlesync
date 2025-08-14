#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * Script to fetch ArmyForge data and split it into individual unit files
 * Usage: node fetch-and-split-army.js [armyforgeId]
 * Example: node fetch-and-split-army.js IJ1JM_m-jmka
 */

const armyforgeId = process.argv[2] || 'IJ1JM_m-jmka';
const baseDir = path.join(__dirname, 'sampleArmyData', armyforgeId);
const armyforgeUrl = `https://army-forge.onepagerules.com/api/tts?id=${armyforgeId}`;

console.log(`Fetching army data for: ${armyforgeId}`);
console.log(`URL: ${armyforgeUrl}`);
console.log(`Output directory: ${baseDir}`);

// Create directory structure
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
  console.log(`Created directory: ${baseDir}`);
}

// Fetch data from ArmyForge
https.get(armyforgeUrl, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const armyData = JSON.parse(data);
      
      // Save raw army data
      const rawFile = path.join(baseDir, 'armyforge_raw.json');
      fs.writeFileSync(rawFile, JSON.stringify(armyData, null, 2));
      console.log(`✅ Saved raw army data: ${rawFile}`);
      
      // Split into individual unit files
      if (armyData.units && Array.isArray(armyData.units)) {
        console.log(`📦 Processing ${armyData.units.length} units...`);
        
        armyData.units.forEach((unit, index) => {
          // Use unit ID as filename, fallback to index
          const filename = unit.id ? `${unit.id}.json` : `unit_${index}.json`;
          const unitFile = path.join(baseDir, filename);
          
          // Add metadata to unit file
          const unitWithMeta = {
            ...unit,
            _metadata: {
              armyforgeId: armyforgeId,
              armyName: armyData.name,
              extractedAt: new Date().toISOString(),
              unitIndex: index
            }
          };
          
          fs.writeFileSync(unitFile, JSON.stringify(unitWithMeta, null, 2));
          console.log(`  ✅ Unit ${index + 1}: ${unit.name || 'Unknown'} -> ${filename}`);
        });
      }
      
      // Create upgrade files for complex units
      console.log('🔧 Extracting upgrade data...');
      let upgradeCount = 0;
      
      armyData.units?.forEach((unit) => {
        if (unit.selectedUpgrades && unit.selectedUpgrades.length > 0) {
          const upgradeFile = path.join(baseDir, `${unit.id}_upgrades.json`);
          const upgradeData = {
            unitId: unit.id,
            unitName: unit.name,
            upgrades: unit.selectedUpgrades,
            _metadata: {
              armyforgeId: armyforgeId,
              extractedAt: new Date().toISOString(),
              upgradeCount: unit.selectedUpgrades.length
            }
          };
          
          fs.writeFileSync(upgradeFile, JSON.stringify(upgradeData, null, 2));
          upgradeCount++;
          console.log(`  ✅ Upgrades: ${unit.name} -> ${unit.id}_upgrades.json`);
        }
      });
      
      // Create summary file
      const summary = {
        armyforgeId: armyforgeId,
        armyName: armyData.name,
        description: armyData.description,
        gameSystem: armyData.gameSystem,
        pointsLimit: armyData.pointsLimit,
        listPoints: armyData.listPoints,
        modelCount: armyData.modelCount,
        activationCount: armyData.activationCount,
        campaignMode: armyData.campaignMode,
        unitCount: armyData.units?.length || 0,
        unitsWithUpgrades: upgradeCount,
        extractedAt: new Date().toISOString(),
        files: {
          raw: 'armyforge_raw.json',
          units: armyData.units?.map(unit => unit.id ? `${unit.id}.json` : null).filter(Boolean) || [],
          upgrades: armyData.units?.filter(unit => unit.selectedUpgrades?.length > 0)
            .map(unit => `${unit.id}_upgrades.json`) || []
        }
      };
      
      const summaryFile = path.join(baseDir, 'army_summary.json');
      fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
      console.log(`📋 Created summary: army_summary.json`);
      
      console.log(`\n🎉 Successfully processed army: ${armyData.name}`);
      console.log(`📁 Files created in: ${baseDir}`);
      console.log(`📊 Stats: ${summary.unitCount} units, ${summary.unitsWithUpgrades} with upgrades`);
      
    } catch (error) {
      console.error('❌ Error parsing JSON:', error.message);
      process.exit(1);
    }
  });
  
}).on('error', (error) => {
  console.error('❌ Error fetching data:', error.message);
  process.exit(1);
});