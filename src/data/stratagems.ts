import { OPRStratagem } from '../types/oprBattle';

/**
 * Complete OPR Stratagems Database
 * Based on One Page Rules Command Points official rules
 */
export const OPR_STRATAGEMS: OPRStratagem[] = [
  // UNIVERSAL DOCTRINE
  {
    id: 'universal-high-command',
    name: 'High Command',
    doctrine: 'universal',
    cost: 1,
    description: 'Add +1 to the result of any single die.',
    timing: 'any',
    usageLimit: 'once-per-activation',
    targetType: 'none',
    canBeCountered: false
  },
  {
    id: 'universal-supreme-command',
    name: 'Supreme Command',
    doctrine: 'universal',
    cost: 2,
    description: 'Add +1 to the result of all dice in a single roll.',
    timing: 'any',
    usageLimit: 'once-per-activation',
    targetType: 'none',
    canBeCountered: false
  },
  {
    id: 'universal-seize-initiative',
    name: 'Seize Initiative',
    doctrine: 'universal',
    cost: 2,
    description: 'When it\'s the enemy turn to activate a unit, you may activate one of your units instead.',
    timing: 'activation',
    usageLimit: 'once-per-activation',
    targetType: 'friendly-unit',
    canBeCountered: true
  },
  {
    id: 'universal-waive-initiative',
    name: 'Waive Initiative',
    doctrine: 'universal',
    cost: 2,
    description: 'When it\'s your turn to activate a unit, you force the opponent to activate one of their units instead.',
    timing: 'activation',
    usageLimit: 'once-per-activation',
    targetType: 'enemy-unit',
    canBeCountered: true
  },
  {
    id: 'universal-delayed-deployment',
    name: 'Delayed Deployment',
    doctrine: 'universal',
    cost: 2,
    description: 'During the deployment phase, when it\'s your turn to place a unit, you may pass the turn to your opponent.',
    timing: 'deployment',
    usageLimit: 'once-per-activation',
    targetType: 'none',
    canBeCountered: true
  },
  {
    id: 'universal-hidden-deployment',
    name: 'Hidden Deployment',
    doctrine: 'universal',
    cost: 3,
    description: 'After all units have deployed, you may remove up to 3 friendly units and place them again in any order.',
    timing: 'deployment',
    usageLimit: 'once-per-battle',
    targetType: 'friendly-unit',
    canBeCountered: true
  },

  // STRATEGIC DOCTRINE
  {
    id: 'strategic-push-forward',
    name: 'Push Forward',
    doctrine: 'strategic',
    cost: 1,
    description: 'Pick one friendly unit that is using an Advance or Rush action, and it may add +2" to its movement.',
    timing: 'movement',
    usageLimit: 'once-per-activation',
    targetType: 'friendly-unit',
    canBeCountered: false
  },
  {
    id: 'strategic-hindered-advance',
    name: 'Hindered Advance',
    doctrine: 'strategic',
    cost: 1,
    description: 'Pick one enemy unit that is moving through terrain, which counts as Dangerous terrain for that movement.',
    timing: 'movement',
    usageLimit: 'once-per-activation',
    targetType: 'enemy-unit',
    canBeCountered: false
  },
  {
    id: 'strategic-coordinated-move',
    name: 'Coordinated Move',
    doctrine: 'strategic',
    cost: 2,
    description: 'Pick two friendly units that are within 12" of each other, which may each move by up to 3" in any direction.',
    timing: 'any',
    usageLimit: 'once-per-activation',
    targetType: 'friendly-unit',
    canBeCountered: false
  },
  {
    id: 'strategic-strategic-relocation',
    name: 'Strategic Relocation',
    doctrine: 'strategic',
    cost: 3,
    description: 'Pick one friendly unit that has just been activated, but that hasn\'t done anything yet, which may be placed anywhere within 6" of its position.',
    timing: 'activation',
    usageLimit: 'once-per-activation',
    targetType: 'friendly-unit',
    canBeCountered: false
  },

  // DEFENSIVE DOCTRINE
  {
    id: 'defensive-eternal-vigilance',
    name: 'Eternal Vigilance',
    doctrine: 'defensive',
    cost: 1,
    description: 'Pick one friendly model that just suffered a wound which would kill it and roll one die, on a 4+ that wound is ignored.',
    timing: 'any',
    usageLimit: 'once-per-activation',
    targetType: 'friendly-unit',
    canBeCountered: false
  },
  {
    id: 'defensive-lightning-reflexes',
    name: 'Lightning Reflexes',
    doctrine: 'defensive',
    cost: 1,
    description: 'Pick one friendly unit that is being shot at, which counts as being in Cover terrain for that shooting.',
    timing: 'shooting',
    usageLimit: 'once-per-activation',
    targetType: 'friendly-unit',
    canBeCountered: false
  },
  {
    id: 'defensive-armour-breaker',
    name: 'Armour Breaker',
    doctrine: 'defensive',
    cost: 2,
    description: 'Pick one enemy unit that has just taken hits, which gets -1 to its Defense rolls against those hits.',
    timing: 'shooting',
    usageLimit: 'once-per-activation',
    targetType: 'enemy-unit',
    canBeCountered: false
  },
  {
    id: 'defensive-tactical-retreat',
    name: 'Tactical Retreat',
    doctrine: 'defensive',
    cost: 3,
    description: 'Pick one friendly unit that is within 12" of an enemy, and it may move up to D6+2" directly away from the closest enemy.',
    timing: 'any',
    usageLimit: 'once-per-activation',
    targetType: 'friendly-unit',
    canBeCountered: false
  },

  // SHOCK DOCTRINE
  {
    id: 'shock-sweeping-move',
    name: 'Sweeping Move',
    doctrine: 'shock',
    cost: 1,
    description: 'Pick one friendly unit that is using a Charge action, and it may add +4" to its movement.',
    timing: 'movement',
    usageLimit: 'once-per-activation',
    targetType: 'friendly-unit',
    canBeCountered: false
  },
  {
    id: 'shock-hit-and-run',
    name: 'Hit & Run',
    doctrine: 'shock',
    cost: 1,
    description: 'Pick one friendly unit that has just finished fighting in melee, which may move by up to 3" in any direction.',
    timing: 'melee',
    usageLimit: 'once-per-activation',
    targetType: 'friendly-unit',
    canBeCountered: false
  },
  {
    id: 'shock-combat-fatigue',
    name: 'Combat Fatigue',
    doctrine: 'shock',
    cost: 2,
    description: 'Pick one enemy unit that is about to strike in melee and roll one die, on a 4+ that unit counts as fatigued for that melee, but doesn\'t get fatigued from that melee.',
    timing: 'melee',
    usageLimit: 'once-per-activation',
    targetType: 'enemy-unit',
    canBeCountered: false
  },
  {
    id: 'shock-killing-blow',
    name: 'Killing Blow',
    doctrine: 'shock',
    cost: 3,
    description: 'Pick one friendly unit that is fighting in melee. Any friendly model that is killed during this melee may strike one more time with all of its weapons before it is removed.',
    timing: 'melee',
    usageLimit: 'once-per-activation',
    targetType: 'friendly-unit',
    canBeCountered: false
  },

  // HUNTING DOCTRINE
  {
    id: 'hunting-heightened-senses',
    name: 'Heightened Senses',
    doctrine: 'hunting',
    cost: 1,
    description: 'Pick one friendly unit that is shooting at an enemy in Cover terrain, which may ignore Cover for that shooting.',
    timing: 'shooting',
    usageLimit: 'once-per-activation',
    targetType: 'friendly-unit',
    canBeCountered: false
  },
  {
    id: 'hunting-disrupted-sight',
    name: 'Disrupted Sight',
    doctrine: 'hunting',
    cost: 1,
    description: 'Pick one enemy unit that is shooting, which gets -3" range for that shooting.',
    timing: 'shooting',
    usageLimit: 'once-per-activation',
    targetType: 'enemy-unit',
    canBeCountered: false
  },
  {
    id: 'hunting-frenzied-attack',
    name: 'Frenzied Attack',
    doctrine: 'hunting',
    cost: 2,
    description: 'Pick one friendly unit that shot at an enemy unit, which may shoot at another enemy unit within 12" of it, but only hits on unmodified rolls of 6.',
    timing: 'shooting',
    usageLimit: 'once-per-activation',
    targetType: 'friendly-unit',
    canBeCountered: false
  },
  {
    id: 'hunting-closing-fire',
    name: 'Closing Fire',
    doctrine: 'hunting',
    cost: 3,
    description: 'Pick one friendly unit that is being charged by an enemy unit, which may shoot at the charging unit at any point during its movement, but gets -1 to hit rolls.',
    timing: 'movement',
    usageLimit: 'once-per-activation',
    targetType: 'friendly-unit',
    canBeCountered: false
  },

  // VALOROUS DOCTRINE
  {
    id: 'valorous-minimize-losses',
    name: 'Minimize Losses',
    doctrine: 'valorous',
    cost: 1,
    description: 'Pick one friendly unit that just became Shaken, which may move up to 2D6+4" directly away from the closest enemy.',
    timing: 'morale',
    usageLimit: 'once-per-activation',
    targetType: 'friendly-unit',
    canBeCountered: false
  },
  {
    id: 'valorous-stand-strong',
    name: 'Stand Strong',
    doctrine: 'valorous',
    cost: 1,
    description: 'Pick one friendly unit that just failed a morale test, which may re-roll that morale test roll.',
    timing: 'morale',
    usageLimit: 'once-per-activation',
    targetType: 'friendly-unit',
    canBeCountered: false
  },
  {
    id: 'valorous-terrorize',
    name: 'Terrorize',
    doctrine: 'valorous',
    cost: 2,
    description: 'Pick one enemy unit that just passed a morale test, which must re-roll that morale test roll.',
    timing: 'morale',
    usageLimit: 'once-per-activation',
    targetType: 'enemy-unit',
    canBeCountered: false
  },
  {
    id: 'valorous-code-of-honor',
    name: 'Code of Honor',
    doctrine: 'valorous',
    cost: 3,
    description: 'Pick one friendly unit that would be Shaken or Routed. If it would be Shaken, it is not. If it would be Routed, then it is Shaken instead.',
    timing: 'morale',
    usageLimit: 'once-per-activation',
    targetType: 'friendly-unit',
    canBeCountered: false
  },

  // TACTICAL DOCTRINE
  {
    id: 'tactical-rush-objective',
    name: 'Rush Objective',
    doctrine: 'tactical',
    cost: 1,
    description: 'Pick one friendly unit that is using a Rush action, and it may add +4" to its movement if it ends up within 3" of an objective.',
    timing: 'movement',
    usageLimit: 'once-per-activation',
    targetType: 'friendly-unit',
    canBeCountered: false
  },
  {
    id: 'tactical-supreme-caster',
    name: 'Supreme Caster',
    doctrine: 'tactical',
    cost: 1,
    description: 'One friendly Caster gets 1 spell token, which may not be spent to give casters +1/-1 to their casting rolls.',
    timing: 'any',
    usageLimit: 'once-per-activation',
    targetType: 'friendly-unit',
    canBeCountered: false
  },
  {
    id: 'tactical-vanish',
    name: 'Vanish',
    doctrine: 'tactical',
    cost: 2,
    description: 'At the end of the round, pick one friendly unit with Ambush and remove it from play (dropping any objectives), and which may be deployed again starting from the next round.',
    timing: 'round-end',
    usageLimit: 'once-per-activation',
    targetType: 'friendly-unit',
    canBeCountered: false
  },
  {
    id: 'tactical-total-shutdown',
    name: 'Total Shutdown',
    doctrine: 'tactical',
    cost: 3,
    description: 'At the end of the round, pick one objective marker under your control that is about to be seized by your opponent, which becomes neutral instead.',
    timing: 'round-end',
    usageLimit: 'once-per-activation',
    targetType: 'objective',
    canBeCountered: false
  }
];

/**
 * Get stratagems available to a player based on their selected doctrine
 */
export function getAvailableStratagems(selectedDoctrine?: string): OPRStratagem[] {
  return OPR_STRATAGEMS.filter(stratagem => 
    stratagem.doctrine === 'universal' || 
    stratagem.doctrine === selectedDoctrine
  );
}

/**
 * Get stratagems by doctrine
 */
export function getStratagemsByDoctrine(doctrine: 'universal' | string): OPRStratagem[] {
  return OPR_STRATAGEMS.filter(stratagem => stratagem.doctrine === doctrine);
}

/**
 * Find stratagem by ID
 */
export function getStratagemById(id: string): OPRStratagem | undefined {
  return OPR_STRATAGEMS.find(stratagem => stratagem.id === id);
}

/**
 * Doctrine display names
 */
export const DOCTRINE_NAMES = {
  strategic: 'Strategic Doctrine',
  defensive: 'Defensive Doctrine', 
  shock: 'Shock Doctrine',
  hunting: 'Hunting Doctrine',
  valorous: 'Valorous Doctrine',
  tactical: 'Tactical Doctrine'
};