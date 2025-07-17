import requests
import json
import os
from time import sleep

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

OUTPUT_FILE = "spells_output.json"
DELAY_BETWEEN_REQUESTS = 0.5  # seconds (be kind to OPR's server)

# === SCRIPT ===
all_spells = []

for slug, system_id in GAME_SYSTEMS.items():
    print(f"\nFetching factions for {slug}...")

    army_list_url = f"https://army-forge.onepagerules.com/api/army-books?filters=official&gameSystemSlug={slug}"
    response = requests.get(army_list_url)
    if response.status_code != 200:
        print(f"Failed to fetch factions for {slug}")
        continue

    army_books = response.json()

    for army in army_books:
        army_uid = army.get("uid")
        army_name = army.get("name")
        print(f" → {army_name} ({army_uid})")

        army_detail_url = f"https://army-forge.onepagerules.com/api/army-books/{army_uid}?gameSystem={system_id}"
        detail_response = requests.get(army_detail_url)
        if detail_response.status_code != 200:
            print(f"    ✖ Failed to fetch army details for {army_name}")
            continue

        army_data = detail_response.json()
        spells = army_data.get("spells", [])
        for spell in spells:
            all_spells.append(
                {
                    "faction": army_name,
                    "gameSystem": slug,
                    "spellId": spell.get("id"),
                    "name": spell.get("name"),
                    "type": spell.get("type"),
                    "threshold": spell.get("threshold"),
                    "effect": spell.get("effect"),
                    "effectSkirmish": spell.get("effectSkirmish"),
                    "spellbookId": spell.get("spellbookId"),
                }
            )

        sleep(DELAY_BETWEEN_REQUESTS)

# === OUTPUT ===
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(all_spells, f, indent=2, ensure_ascii=False)

print(f"\n✅ Spell data saved to {OUTPUT_FILE} ({len(all_spells)} spells total)")

import csv

csv_file = "spells_output.csv"
with open(csv_file, mode="w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=all_spells[0].keys())
    writer.writeheader()
    writer.writerows(all_spells)

print(f"📄 Spell data also saved to {csv_file}")
