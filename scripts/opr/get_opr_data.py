#!/usr/bin/env python3
"""
OPR Data Collection Script

Fetches spells and special rules from all official OPR army books across all game systems.
Saves data to JSON and CSV formats for analysis and integration.

Usage: python3 get_opr_data.py
Output: /data/opr/spells.json, /data/opr/special_rules.json (and CSV equivalents)
"""

import requests
import json
import csv
from time import sleep
from pathlib import Path

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

# === DATA COLLECTION ===
all_spells = []
all_special_rules = []

print("🔮 OPR Data Collection Script")
print("=" * 50)

for slug, system_id in GAME_SYSTEMS.items():
    print(f"\n📚 Fetching factions for {slug}...")

    army_list_url = f"https://army-forge.onepagerules.com/api/army-books?filters=official&gameSystemSlug={slug}"
    response = requests.get(army_list_url)
    if response.status_code != 200:
        print(f"    ❌ Failed to fetch factions for {slug}")
        continue

    army_books = response.json()

    for army in army_books:
        army_uid = army.get("uid")
        army_name = army.get("name")
        print(f" → {army_name} ({army_uid})")

        army_detail_url = f"https://army-forge.onepagerules.com/api/army-books/{army_uid}?gameSystem={system_id}"
        detail_response = requests.get(army_detail_url)
        if detail_response.status_code != 200:
            print(f"    ❌ Failed to fetch army details for {army_name}")
            continue

        army_data = detail_response.json()
        
        # === COLLECT SPELLS ===
        spells = army_data.get("spells", [])
        for spell in spells:
            all_spells.append({
                "faction": army_name,
                "gameSystem": slug,
                "armyUid": army_uid,
                "spellId": spell.get("id"),
                "name": spell.get("name"),
                "type": spell.get("type"),
                "threshold": spell.get("threshold"),
                "effect": spell.get("effect"),
                "effectSkirmish": spell.get("effectSkirmish"),
                "spellbookId": spell.get("spellbookId"),
            })

        # === COLLECT SPECIAL RULES ===
        special_rules = army_data.get("specialRules", [])
        for rule in special_rules:
            all_special_rules.append({
                "faction": army_name,
                "gameSystem": slug,
                "armyUid": army_uid,
                "ruleId": rule.get("id"),
                "name": rule.get("name"),
                "aliasedRuleId": rule.get("aliasedRuleId"),
                "description": rule.get("description"),
                "hasRating": rule.get("hasRating"),
                "coreType": rule.get("coreType"),
                "targetType": rule.get("targetType"),
            })

        print(f"    ✅ {len(spells)} spells, {len(special_rules)} special rules")
        sleep(DELAY_BETWEEN_REQUESTS)

# === SAVE SPELLS DATA ===
spells_json_file = OUTPUT_DIR / "spells.json"
spells_csv_file = OUTPUT_DIR / "spells.csv"

with open(spells_json_file, "w", encoding="utf-8") as f:
    json.dump(all_spells, f, indent=2, ensure_ascii=False)

if all_spells:  # Only create CSV if we have data
    with open(spells_csv_file, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=all_spells[0].keys())
        writer.writeheader()
        writer.writerows(all_spells)

# === SAVE SPECIAL RULES DATA ===
rules_json_file = OUTPUT_DIR / "special_rules.json"
rules_csv_file = OUTPUT_DIR / "special_rules.csv"

with open(rules_json_file, "w", encoding="utf-8") as f:
    json.dump(all_special_rules, f, indent=2, ensure_ascii=False)

if all_special_rules:  # Only create CSV if we have data
    with open(rules_csv_file, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=all_special_rules[0].keys())
        writer.writeheader()
        writer.writerows(all_special_rules)

# === SUMMARY ===
print("\n" + "=" * 50)
print("📊 Collection Summary:")
print(f"   🔮 Spells: {len(all_spells)} total")
print(f"   ⚡ Special Rules: {len(all_special_rules)} total")
print(f"   🎯 Game Systems: {len(GAME_SYSTEMS)}")
print(f"   📁 Output Directory: {OUTPUT_DIR}")

print("\n✅ Files saved:")
print(f"   📄 {spells_json_file.relative_to(Path.cwd())}")
print(f"   📊 {spells_csv_file.relative_to(Path.cwd())}")
print(f"   📄 {rules_json_file.relative_to(Path.cwd())}")
print(f"   📊 {rules_csv_file.relative_to(Path.cwd())}")

# === ANALYSIS PREVIEW ===
if all_special_rules:
    print("\n🔍 Special Rules Preview:")
    unique_rules = {}
    for rule in all_special_rules:
        rule_name = rule["name"]
        if rule_name not in unique_rules:
            unique_rules[rule_name] = {"count": 0, "factions": set()}
        unique_rules[rule_name]["count"] += 1
        unique_rules[rule_name]["factions"].add(rule["faction"])
    
    # Show most common special rules
    sorted_rules = sorted(unique_rules.items(), key=lambda x: x[1]["count"], reverse=True)
    print(f"   📈 Most common special rules:")
    for rule_name, data in sorted_rules[:10]:
        faction_count = len(data["factions"])
        print(f"      • {rule_name}: {data['count']} instances across {faction_count} factions")

print("\n🎉 Data collection complete!")