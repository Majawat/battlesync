# BattleAura ESP32 System

**BattleAura** brings your tabletop miniatures to life with synchronized lights and sounds that respond to real-time battle events from BattleSync.

## System Overview

BattleAura uses ESP32 microcontrollers embedded in miniatures to create immersive effects:
- **Weapon firing**: LED strobes + weapon-specific sounds
- **Taking damage**: Red damage indicators + impact sounds  
- **Unit activation**: Gentle pulsing + ready sounds
- **Movement detection**: Automatic tilt-sensor triggered effects

## Architecture

```
BattleSync Server (battlesync.me)
    ↓ WebSocket Events
ESP32 in Miniature (WiFi connected)
    ↓ Hardware Control
LEDs + Speaker + Sensors
```

## Hardware Components

### Core Electronics
- **Seeed Studio XIAO ESP32-C3**: Main controller
- **14500 Battery (800mAh, 3.7V)**: Power source
- **AMS1117-3.3 DC-DC**: Power regulation  
- **DFPlayer Mini**: Audio playback
- **32GB microSD**: Sound effect storage
- **Tilt Switch**: Movement detection
- **Toggle Switch**: Power control

### Example: Embers of Judgement (Infernal APC)
- **Brazier LED**: 3.5mm main feature light
- **Cockpit LED**: 3.5mm pilot status indicator
- **Engine Stack LEDs**: 2x 3.2mm engine indicators
- **Candle Groups**: 2x 3mm fiber optic illumination
- **Weapon LEDs**: 2x 1.6mm nano weapon indicators

## Directory Structure

```
esp32-system/
├── firmware/
│   └── BattleAura/              # Arduino ESP32 firmware
├── hardware/
│   ├── schematics/              # Circuit diagrams
│   └── 3d-models/               # Base and mount designs
└── docs/
    ├── build-guide.md           # Hardware assembly guide
    ├── firmware-setup.md        # Programming instructions
    └── troubleshooting.md       # Common issues and fixes
```

## Quick Start

1. **Hardware Assembly**: Follow [build-guide.md](docs/build-guide.md)
2. **Firmware Setup**: Flash ESP32 using [firmware-setup.md](docs/firmware-setup.md)  
3. **WiFi Configuration**: Connect to "BattleAura-Setup" hotspot
4. **BattleSync Integration**: Use Army Detail View → BattleAura Setup

## Features

### Current Implementation (v1.0)
- ✅ Configurable server connection (battlesync.me or custom)
- ✅ WiFi configuration portal for easy setup
- ✅ Direct WebSocket connection to BattleSync
- ✅ Real-time battle event processing
- ✅ Weapon-specific LED and sound effects
- ✅ Movement detection via tilt sensor
- ✅ Low power sleep modes for battery life

### Planned Features (v2.0+)
- 🚧 WS2812B addressable LED support
- 🚧 Advanced color effects and animations
- 🚧 Battery level monitoring and reporting
- 🚧 Over-the-air firmware updates
- 🚧 Formation synchronization effects
- 🚧 Mobile app for advanced configuration

## Technical Specifications

- **WiFi**: 802.11 b/g/n (2.4GHz)
- **Power**: 3.3V regulated, ~80mA active, ~10μA sleep
- **Audio**: MP3 playback via DFPlayer Mini
- **LEDs**: Up to 9 direct GPIO pins + expansion options
- **Communication**: WebSocket over WiFi to BattleSync
- **Range**: WiFi network coverage area
- **Battery Life**: 6-12 hours active gaming sessions

---

**Compatible with**: BattleSync v1.4.1+  
**Hardware Designed for**: Seeed Studio XIAO ESP32-C3  
**Firmware Platform**: Arduino ESP32