# BattleAura Hardware Build Guide

This guide walks you through building BattleAura-enabled miniatures with ESP32 controllers for real-time battle effects.

## Required Components

### Core Electronics
- **Seeed Studio XIAO ESP32-C3** - Main microcontroller
- **14500 Battery (800mAh, 3.7V)** - Lithium-ion power source  
- **AMS1117-3.3 DC-DC Step Down** - Power regulation module
- **DFPlayer Mini** - MP3 audio module
- **32GB microSD Card** - Sound effect storage
- **14500 Battery Holder** - Single cell holder
- **Mini Toggle Switch** - Power on/off control
- **Ball Tilt Switch** - Movement detection (optional)

### LEDs (Example: Embers of Judgement)
- **2x 3.5mm LEDs** - Brazier and cockpit lighting
- **2x 3.2mm LEDs** - Engine stack indicators  
- **2x 3mm LEDs** - Candle groups (fiber optic)
- **2x 1.6mm Nano LEDs** - Weapon indicators
- **Current limiting resistors** - 220Ω for 3.3V operation

### Wiring & Assembly
- **30 AWG Magnet Wire** - Thin, insulated connections
- **Heat Shrink Tubing** - Connection protection
- **Hot Glue** - Strain relief and mounting
- **Small Perfboard** - Component mounting (optional)

## Circuit Diagram

```
14500 Battery (3.7V)
    │
    ├── Toggle Switch ──┐
    │                   │
    └── AMS1117 ────────┤
         │              │
         └── 3.3V ──────┴── ESP32-C3 VCC
                              │
    ┌─────────────────────────┤
    │                         │
DFPlayer Mini               GPIO Pins
    │                         │
    ├── TX → D6               ├── D2 → Brazier LED (+) ──┐
    ├── RX → D7               ├── D3 → Cockpit LED (+) ──┤
    ├── VCC → 3.3V            ├── D4 → Engine 1 LED (+) ─┤
    ├── GND → GND             ├── D5 → Engine 2 LED (+) ─┤
    └── SPK+ → Speaker        ├── D8 → Candle 1 LED (+) ─┤
        SPK- → Speaker        ├── D9 → Candle 2 LED (+) ─┤
                              ├── D10 → Flamer LED (+) ──┤
                              ├── D0 → MG LED (+) ───────┤
Tilt Switch                   └── D1 → Tilt Switch      │
    │                                                    │
    └── GND                                              │
                                                         │
All LED (-) pins ──┬─────────────────────────────────────┘
                   │
                  GND
```

## Step-by-Step Assembly

### Step 1: Prepare the ESP32

1. **Test the ESP32** first on a breadboard
2. **Flash the BattleAura firmware** (see [firmware-setup.md](firmware-setup.md))
3. **Test basic functionality** before miniature integration

### Step 2: Power System

1. **Install the battery holder** in miniature base
2. **Mount the AMS1117** power regulator near battery
3. **Add toggle switch** for easy power control
4. **Test power delivery**: Should read 3.3V at ESP32

**Power Connections:**
```
Battery (+) → Toggle Switch → AMS1117 Input
Battery (-) → AMS1117 GND → ESP32 GND
AMS1117 Output → ESP32 VCC (3.3V)
```

### Step 3: Audio System (Optional)

1. **Mount DFPlayer Mini** in available space
2. **Connect speaker** (8Ω, 0.5W recommended for size)
3. **Prepare microSD card** with sound effects
4. **Test audio playback** before final assembly

**Audio File Structure:**
```
microSD Root/
├── 001.mp3  # Heavy Flamer sound
├── 002.mp3  # Heavy Machine Gun
├── 003.mp3  # Generic weapon
├── 005.mp3  # Unit activation
├── 006.mp3  # Movement sound
├── 010.mp3  # Damage taken
└── 015.mp3  # Unit destroyed
```

### Step 4: LED Installation

1. **Plan LED placement** based on miniature features
2. **Drill holes** carefully with appropriate bit sizes:
   - 3.5mm LEDs: 3.6mm drill bit
   - 3.2mm LEDs: 3.3mm drill bit  
   - 1.6mm Nano LEDs: 1.7mm drill bit
3. **Test fit LEDs** before gluing
4. **Calculate resistor values** for desired brightness

**LED Current Calculations:**
```
Forward Voltage (Vf): ~2.0V (typical red LED)
Supply Voltage: 3.3V
Desired Current: 10mA (moderate brightness)

Resistor = (3.3V - 2.0V) / 0.01A = 130Ω
Use 150Ω for safety margin
```

### Step 5: Wiring

1. **Use 30 AWG magnet wire** for minimal bulk
2. **Plan wire routing** to avoid mechanical stress
3. **Add strain relief** with heat shrink tubing
4. **Test each connection** before closing miniature

**Wiring Tips:**
- Keep power wires (VCC/GND) separate from signal wires
- Use different wire colors for easy troubleshooting
- Twist long wire runs to reduce interference
- Add loop for strain relief at stress points

### Step 6: Final Assembly

1. **Secure all components** with hot glue or mounting brackets
2. **Close miniature** ensuring no wire pinching
3. **Test all functions** with BattleSync integration
4. **Document the configuration** for future reference

## Integration Options

### Option A: External Base Mount
- **Pros**: Reversible, works with existing miniatures
- **Cons**: Visible electronics, larger base profile
- **Best for**: Testing and prototyping

### Option B: Hollowed Miniature
- **Pros**: Clean appearance, integrated look
- **Cons**: Permanent modification required
- **Best for**: Larger miniatures with hollow areas

### Option C: Custom Base Insert
- **Pros**: Professional appearance, removable
- **Cons**: Requires 3D printing or custom fabrication
- **Best for**: Production builds

## Power Management

### Battery Life Optimization

**Active Gaming (3-6 hours):**
- ESP32-C3: ~80mA average
- LEDs (all on): ~70mA (7 LEDs × 10mA)
- Audio: ~50mA when playing
- **Total**: ~200mA during effects

**Standby (Deep Sleep):**
- ESP32-C3: ~10μA
- Power regulator: ~100μA
- **Total**: ~110μA when inactive

**Charging Options:**
1. **Removable battery**: Swap 14500 cells
2. **USB charging**: Add TP4056 charging module
3. **Wireless charging**: Qi receiver coil (advanced)

### Sleep Mode Implementation

The firmware automatically enters deep sleep after 5 minutes of inactivity:
- WebSocket disconnection triggers sleep
- Tilt sensor wake-up enabled
- Power button wake-up enabled
- Network reconnection on wake

## Troubleshooting

### Common Issues

**Device not discovered:**
- Check WiFi connection
- Verify power supply voltage (3.3V)
- Ensure firmware is properly flashed
- Check serial output for error messages

**Audio not working:**
- Verify DFPlayer wiring (TX/RX swapped?)
- Check microSD card format (FAT32)
- Test speaker impedance (8Ω recommended)
- Verify audio files are properly named

**LEDs not lighting:**
- Check resistor values and connections  
- Verify GPIO pin assignments match firmware
- Test LED polarity (+ to GPIO, - to GND)
- Measure current draw (should be ~10mA per LED)

**Battery drains quickly:**
- Check for continuous current draw
- Verify deep sleep functionality
- Look for GPIO pin conflicts
- Monitor power regulator efficiency

### Testing Checklist

- [ ] Power system provides stable 3.3V
- [ ] ESP32 connects to WiFi successfully  
- [ ] WebSocket connection to BattleSync established
- [ ] All LEDs light individually
- [ ] Audio plays correctly from all files
- [ ] Tilt sensor triggers movement detection
- [ ] Device responds to BattleSync commands
- [ ] Battery lasts expected duration
- [ ] Deep sleep/wake cycle functions properly

## Safety Considerations

- **Battery Safety**: Use protected 14500 cells only
- **Heat Management**: Ensure adequate ventilation
- **Wire Gauge**: 30 AWG sufficient for low current loads
- **Voltage Regulation**: AMS1117 prevents overvoltage damage
- **ESD Protection**: Handle ESP32 with proper precautions

## Next Steps

Once your hardware is assembled and tested:

1. **Configure WiFi**: Connect to "BattleAura-Setup" network
2. **Set BattleSync Server**: Point to your battlesync.me instance
3. **Test Discovery**: Use Army Detail View → BattleAura Setup
4. **Assign to Units**: Map devices to specific battle units
5. **Test Battle Effects**: Verify real-time synchronization

For firmware setup and programming instructions, see [firmware-setup.md](firmware-setup.md).

For troubleshooting common issues, see [troubleshooting.md](troubleshooting.md).