// TypeScript types for ArmyForge API data structures

export interface ArmyForgeRule {
  id: string;
  name: string;
  rating?: number | string;
  label: string;
  type?: string;
  dependencies?: any[];
  count?: number;
}

export interface ArmyForgeWeapon {
  id: string;
  name: string;
  type: 'ArmyBookWeapon';
  range: number;
  attacks: number | string;
  weaponId: string;
  specialRules: ArmyForgeRule[];
  label: string;
  count: number;
  originalCount: number;
  dependencies?: {
    upgradeInstanceId: string;
    count: number;
    variant: string;
  }[];
}

export interface ArmyForgeItem {
  id?: string;
  name: string;
  type: 'ArmyBookItem';
  bases?: {
    round?: string;
    square?: string;
  } | null;
  label: string;
  content: ArmyForgeRule[];
  count: number;
  dependencies: any[];
}

export interface ArmyForgeUpgradeOption {
  uid: string;
  cost?: number;
  type: 'ArmyBookUpgradeOption';
  costs: {
    cost: number;
    unitId: string;
  }[];
  gains: (ArmyForgeWeapon | ArmyForgeItem | ArmyForgeRule)[];
  label: string;
  parentSectionId: string;
  id: string;
}

export interface ArmyForgeUpgrade {
  id: string;
  uid: string;
  label: string;
  parentPackageUid: string;
  type: 'ArmyBookUpgradeSection';
  variant: 'upgrade' | 'replace';
  isHeroUpgrade?: boolean;
  affects?: {
    type: string;
    value: number;
  };
  targets?: string[];
  select?: {
    type: string;
    value: number;
  };
}

export interface ArmyForgeSelectedUpgrade {
  instanceId: string;
  upgrade: ArmyForgeUpgrade;
  option: ArmyForgeUpgradeOption;
}

export interface ArmyForgeUnit {
  id: string;
  cost: number;
  name: string;
  customName?: string;
  size: number;
  bases: {
    round: string;
    square: string;
  };
  items: ArmyForgeItem[];
  rules: ArmyForgeRule[];
  valid: boolean;
  defense: number;
  quality: number;
  weapons: ArmyForgeWeapon[];
  upgrades: string[];
  hasCustomRule: boolean;
  disabledSections: string[];
  hasBalanceInvalid: boolean;
  disabledUpgradeSections: string[];
  armyId: string;
  xp: number;
  notes?: string | null;
  traits: string[];
  combined: boolean;
  joinToUnit: string | null;
  selectionId: string;
  selectedUpgrades: ArmyForgeSelectedUpgrade[];
  loadout: (ArmyForgeWeapon | ArmyForgeItem)[];
}

export interface ArmyForgeArmy {
  id: string;
  name: string;
  isCloud: boolean;
  forceOrg: boolean;
  modified: string;
  gameSystem: string;
  modelCount: number;
  description: string;
  pointsLimit: number;
  campaignMode: boolean;
  cloudModified: string;
  narrativeMode: boolean;
  activationCount: number;
  listPoints: number;
  units: ArmyForgeUnit[];
}