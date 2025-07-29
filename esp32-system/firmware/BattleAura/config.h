/*
 * BattleAura Hardware Configuration
 * 
 * Pin assignments and hardware settings for different miniature types.
 * Modify this file for your specific miniature configuration.
 */

#ifndef CONFIG_H
#define CONFIG_H

// Firmware Version
#define FIRMWARE_VERSION "1.0.0"

// Hardware Capabilities
#define LED_COUNT 7
#define HAS_AUDIO true
#define HAS_TILT_SENSOR true

// ============================================
// SEEED STUDIO XIAO ESP32-C3 PIN ASSIGNMENTS
// ============================================
// Available GPIO pins: D0-D10 (11 total)
// D6/D7 are typically used for serial programming

// LED Pin Assignments (Embers of Judgement Configuration)
#define BRAZIER_LED           2    // 3.5mm main feature LED
#define COCKPIT_LED           3    // 3.5mm pilot status LED
#define ENGINE_STACK_1        4    // 3.2mm left engine LED
#define ENGINE_STACK_2        5    // 3.2mm right engine LED
#define CANDLE_GROUP_1        8    // 3mm fiber optic group 1
#define CANDLE_GROUP_2        9    // 3mm fiber optic group 2
#define HEAVY_FLAMER_LED     10    // 1.6mm weapon LED
#define HEAVY_MG_LED          0    // 1.6mm weapon LED

// Audio & Communication
#define DFPLAYER_RX           6    // DFPlayer Mini RX pin
#define DFPLAYER_TX           7    // DFPlayer Mini TX pin

// Sensor Pins
#define TILT_SWITCH           1    // Movement detection sensor

// Power Management
// Note: Power switch should be connected to EN pin for proper deep sleep

// ============================================
// ALTERNATIVE CONFIGURATIONS
// ============================================

/*
// Minimal Configuration (3 LEDs + Audio)
#define LED_COUNT 3
#define MAIN_LED              2
#define WEAPON_LED_1          3
#define WEAPON_LED_2          4
#define DFPLAYER_RX           6
#define DFPLAYER_TX           7
#define TILT_SWITCH           8
*/

/*
// Maximum LED Configuration (with shift register)
#define LED_COUNT 16
#define SR_DATA_PIN           2    // Shift register data
#define SR_CLOCK_PIN          3    // Shift register clock  
#define SR_LATCH_PIN          4    // Shift register latch
#define DFPLAYER_RX           6
#define DFPLAYER_TX           7
#define TILT_SWITCH           8
*/

/*
// WS2812B Addressable LED Configuration
#define LED_COUNT 20
#define WS2812_DATA_PIN       2    // NeoPixel data pin
#define DFPLAYER_RX           6
#define DFPLAYER_TX           7
#define TILT_SWITCH           8
*/

// ============================================
// AUDIO CONFIGURATION
// ============================================

// Sound File Mapping (stored on microSD card)
// Files should be named 001.mp3, 002.mp3, etc.
#define SOUND_HEAVY_FLAMER    1    // 001.mp3 - Flame thrower
#define SOUND_HEAVY_MG        2    // 002.mp3 - Machine gun
#define SOUND_GENERIC_WEAPON  3    // 003.mp3 - Generic weapon
#define SOUND_ACTIVATION      5    // 005.mp3 - Unit ready
#define SOUND_MOVEMENT        6    // 006.mp3 - Movement/engine
#define SOUND_DAMAGE         10    // 010.mp3 - Taking damage
#define SOUND_DESTROYED      15    // 015.mp3 - Unit destroyed

// Audio Settings
#define DEFAULT_VOLUME       20    // 0-30 scale
#define MAX_VOLUME           30

// ============================================
// POWER MANAGEMENT
// ============================================

// Battery monitoring (optional)
#define BATTERY_ADC_PIN      A0    // Battery voltage divider
#define BATTERY_MIN_VOLTAGE  2800  // mV - empty battery
#define BATTERY_MAX_VOLTAGE  4200  // mV - full battery

// Sleep settings
#define SLEEP_TIMEOUT        300000  // 5 minutes of inactivity
#define HEARTBEAT_INTERVAL   30000   // 30 seconds

// ============================================
// NETWORK CONFIGURATION
// ============================================

// Default server settings (can be changed via WiFi portal)
#define DEFAULT_SERVER       "battlesync.me"
#define DEFAULT_PORT         443
#define DEFAULT_PATH         "/ws"
#define USE_SSL              true

// WiFi configuration portal settings
#define CONFIG_PORTAL_TIMEOUT 300   // 5 minutes
#define MAX_WIFI_RETRY        3

// WebSocket settings
#define WEBSOCKET_RECONNECT_INTERVAL 5000  // 5 seconds
#define WEBSOCKET_PING_INTERVAL      25000 // 25 seconds

// ============================================
// EFFECT TIMING CONFIGURATION
// ============================================

// LED effect durations (milliseconds)
#define WEAPON_EFFECT_DURATION    2000   // Weapon firing
#define DAMAGE_EFFECT_DURATION    1000   // Taking damage
#define ACTIVATION_EFFECT_DURATION 500   // Unit activation
#define MOVEMENT_EFFECT_DURATION   300   // Movement indication

// LED brightness levels (0-255)
#define BRIGHTNESS_LOW        50
#define BRIGHTNESS_MEDIUM     150
#define BRIGHTNESS_HIGH       255

// Effect refresh rates
#define EFFECT_UPDATE_RATE    50     // milliseconds between effect updates
#define SENSOR_CHECK_RATE     100    // milliseconds between sensor checks

// ============================================
// DEBUG CONFIGURATION
// ============================================

// Enable/disable debug output
#define DEBUG_ENABLED         true
#define DEBUG_WEBSOCKET       true
#define DEBUG_EFFECTS         true
#define DEBUG_SENSORS         true

// Serial baud rate
#define SERIAL_BAUD_RATE      115200

#endif // CONFIG_H