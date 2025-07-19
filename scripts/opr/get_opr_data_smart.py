#!/usr/bin/env python3
"""
Smart OPR Data Collection Script

Efficiently fetches spells and special rules from OPR army books while avoiding
duplicates across compatible game systems. Uses enabledGameSystems metadata
to determine when armies are shared across systems.

Usage: python3 get_opr_data_smart.py [--force-duplicates]
Output: /data/opr/spells.json, /data/opr/special_rules.json (and CSV equivalents)
"""

import requests
import json
import csv
import argparse
from time import sleep
from pathlib import Path
from collections import defaultdict

# === SETTINGS ===
GAME_SYSTEMS = {
    "grimdark-future": 2,
    "grimdark-future-firefight": 3,
    "age-of-fantasy": 4,
    "age-of-fantasy-skirmish": 5,
    "age-of-fantasy-regiments": 6,
    "age-of-fantasy-quest": 7,
    "grimdark-future-star-quest": 9,
}

# Create output directory
OUTPUT_DIR = Path(__file__).parent.parent.parent / "data" / "opr"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

DELAY_BETWEEN_REQUESTS = 0.01  # seconds (be kind to OPR's server)

def parse_args():
    parser = argparse.ArgumentParser(description="Smart OPR data collection")
    parser.add_argument("--force-duplicates", action="store_true",
                       help="Force collection even if army appears in multiple systems")
    parser.add_argument("--verbose", "-v", action="store_true",
                       help="Show detailed progress information")
    return parser.parse_args()

def get_army_metadata(slug, system_id):
    """Get army list with metadata to understand cross-system compatibility."""
    army_list_url = f"https://army-forge.onepagerules.com/api/army-books?filters=official&gameSystemSlug={slug}"
    response = requests.get(army_list_url)
    if response.status_code != 200:
        return []
    
    armies = response.json()
    for army in armies:
        army['primary_system'] = slug
        army['primary_system_id'] = system_id
    return armies

def main():
    args = parse_args()
    
    print("🧠 Smart OPR Data Collection Script")
    print("=" * 50)
    
    # First pass: collect all army metadata
    print("📋 Phase 1: Collecting army metadata...")
    all_armies = {}  # uid -> army_info
    army_systems = defaultdict(list)  # uid -> [systems_it_appears_in]
    
    for slug, system_id in GAME_SYSTEMS.items():
        print(f"   📚 Scanning {slug}...")
        armies = get_army_metadata(slug, system_id)
        
        for army in armies:
            uid = army.get("uid")
            if uid not in all_armies:
                all_armies[uid] = army
            army_systems[uid].append((slug, system_id))
    
    # Analysis of cross-system armies
    cross_system_armies = {uid: systems for uid, systems in army_systems.items() if len(systems) > 1}
    
    print(f"\n📊 Army Analysis:")
    print(f"   📦 Total unique armies: {len(all_armies)}")
    print(f"   🔄 Cross-system armies: {len(cross_system_armies)}")
    
    if args.verbose and cross_system_armies:
        print(f"\n🔍 Cross-system armies (showing first 10):")
        for uid, systems in list(cross_system_armies.items())[:10]:
            army_name = all_armies[uid].get('name', 'Unknown')
            system_names = [s[0] for s in systems]
            print(f"      • {army_name}: {', '.join(system_names)}")
        if len(cross_system_armies) > 10:
            print(f"      ... and {len(cross_system_armies) - 10} more")
    
    # Second pass: collect data efficiently
    print(f"\n📋 Phase 2: Collecting spell and special rules data...")
    all_spells = []
    all_special_rules = []
    processed_armies = set()
    
    for uid, army_info in all_armies.items():
        army_name = army_info.get("name")
        systems = army_systems[uid]
        
        # Skip if we've already processed this army (unless forced)
        if uid in processed_armies and not args.force_duplicates:
            if args.verbose:
                print(f"   ⏭️  Skipping {army_name} (already processed)")
            continue
        
        # Use the primary system for data collection
        primary_slug, primary_system_id = systems[0]
        print(f" → {army_name} ({uid}) via {primary_slug}")
        
        army_detail_url = f"https://army-forge.onepagerules.com/api/army-books/{uid}?gameSystem={primary_system_id}"
        detail_response = requests.get(army_detail_url)
        if detail_response.status_code != 200:
            print(f"    ❌ Failed to fetch army details for {army_name}")
            continue
        
        army_data = detail_response.json()
        
        # Get enabledGameSystems for verification
        enabled_systems = army_data.get("enabledGameSystems", [])
        
        # === COLLECT SPELLS ===
        spells = army_data.get("spells", [])
        for spell in spells:
            # Add spell for each compatible system
            for slug, system_id in systems:
                if args.force_duplicates or system_id in enabled_systems or len(systems) == 1:
                    all_spells.append({
                        "faction": army_name,
                        "gameSystem": slug,
                        "armyUid": uid,
                        "spellId": spell.get("id"),
                        "name": spell.get("name"),
                        "type": spell.get("type"),
                        "threshold": spell.get("threshold"),
                        "effect": spell.get("effect"),
                        "effectSkirmish": spell.get("effectSkirmish"),
                        "spellbookId": spell.get("spellbookId"),
                        "enabledGameSystems": enabled_systems,
                    })
        
        # === COLLECT SPECIAL RULES ===
        special_rules = army_data.get("specialRules", [])
        for rule in special_rules:
            # Add rule for each compatible system
            for slug, system_id in systems:
                if args.force_duplicates or system_id in enabled_systems or len(systems) == 1:
                    all_special_rules.append({
                        "faction": army_name,
                        "gameSystem": slug,
                        "armyUid": uid,
                        "ruleId": rule.get("id"),
                        "name": rule.get("name"),
                        "aliasedRuleId": rule.get("aliasedRuleId"),
                        "description": rule.get("description"),
                        "hasRating": rule.get("hasRating"),
                        "coreType": rule.get("coreType"),
                        "targetType": rule.get("targetType"),
                        "enabledGameSystems": enabled_systems,
                    })
        
        processed_armies.add(uid)
        print(f"    ✅ {len(spells)} spells, {len(special_rules)} special rules")
        print(f"       Compatible systems: {enabled_systems}")
        
        sleep(DELAY_BETWEEN_REQUESTS)
    
    # === SAVE DATA ===
    print(f"\n💾 Saving data...")
    
    # Save spells
    spells_json = OUTPUT_DIR / "spells_smart.json"
    spells_csv = OUTPUT_DIR / "spells_smart.csv"
    
    with open(spells_json, "w", encoding="utf-8") as f:
        json.dump(all_spells, f, indent=2, ensure_ascii=False)
    
    if all_spells:
        with open(spells_csv, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=all_spells[0].keys())
            writer.writeheader()
            writer.writerows(all_spells)
    
    # Save special rules
    rules_json = OUTPUT_DIR / "special_rules_smart.json"
    rules_csv = OUTPUT_DIR / "special_rules_smart.csv"
    
    with open(rules_json, "w", encoding="utf-8") as f:
        json.dump(all_special_rules, f, indent=2, ensure_ascii=False)
    
    if all_special_rules:
        with open(rules_csv, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=all_special_rules[0].keys())
            writer.writeheader()
            writer.writerows(all_special_rules)
    
    # === SUMMARY ===
    print("\n" + "=" * 50)
    print("📊 Smart Collection Summary:")
    print(f"   🔮 Spells: {len(all_spells)} total")
    print(f"   ⚡ Special Rules: {len(all_special_rules)} total")
    print(f"   📦 Unique Armies: {len(processed_armies)}")
    print(f"   🔄 Cross-system armies: {len(cross_system_armies)}")
    print(f"   🎯 API calls saved: ~{len(cross_system_armies) * 2}")
    
    print(f"\n✅ Smart files saved:")
    print(f"   📄 {spells_json.relative_to(Path.cwd())}")
    print(f"   📊 {spells_csv.relative_to(Path.cwd())}")
    print(f"   📄 {rules_json.relative_to(Path.cwd())}")
    print(f"   📊 {rules_csv.relative_to(Path.cwd())}")
    
    # === PARSING HINTS ===
    if all_special_rules:
        print(f"\n🔍 Rule Description Parsing Hints:")
        
        # Find rules that might benefit from structured parsing
        rating_indicators = ["(X)", "+X", "-X", "X dice", "X\"", "X+"]
        complex_rules = []
        
        for rule in all_special_rules[:50]:  # Sample first 50
            desc = rule.get("description", "")
            if any(indicator in desc for indicator in rating_indicators):
                complex_rules.append(rule["name"])
        
        if complex_rules:
            unique_complex = list(set(complex_rules))[:10]
            print(f"   📈 Rules with potential ratings: {', '.join(unique_complex)}")
            print(f"   💡 Consider regex parsing for: {rating_indicators}")
    
    print(f"\n🎉 Smart collection complete!")

if __name__ == "__main__":
    main()