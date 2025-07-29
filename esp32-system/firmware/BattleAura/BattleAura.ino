/*
 * BattleAura ESP32 Firmware v1.0
 * 
 * Brings tabletop miniatures to life with synchronized lights and sounds
 * that respond to real-time battle events from BattleSync.
 * 
 * Hardware: Seeed Studio XIAO ESP32-C3
 * Compatible with: BattleSync v1.4.1+
 * 
 * Features:
 * - WiFi configuration portal with configurable server
 * - WebSocket connection to BattleSync server
 * - Real-time battle event processing
 * - LED effects and audio playback
 * - Movement detection via tilt sensor
 * - Low power sleep modes for battery life
 */

#include <WiFi.h>
#include <WiFiManager.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <DFRobotDFPlayerMini.h>
#include <SoftwareSerial.h>

// Hardware Configuration
#include "config.h"

// Global Objects
WiFiManager wifiManager;
WebSocketsClient webSocket;
Preferences preferences;
SoftwareSerial mySoftwareSerial(DFPLAYER_RX, DFPLAYER_TX);
DFRobotDFPlayerMini myDFPlayer;

// Device State
String deviceId;
String deviceName;
String serverAddress = "battlesync.me";  // Default server
String serverPath = "/ws";
bool isConnected = false;
bool audioEnabled = HAS_AUDIO;
unsigned long lastHeartbeat = 0;
unsigned long lastMovementCheck = 0;
bool lastTiltState = false;

// Effect State
bool effectActive = false;
unsigned long effectEndTime = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("BattleAura ESP32 Starting...");
  
  // Initialize hardware
  initializeHardware();
  
  // Generate device identity
  generateDeviceIdentity();
  
  // Load saved configuration
  loadConfiguration();
  
  // Setup WiFi with configuration portal
  setupWiFi();
  
  // Connect to BattleSync server
  connectToBattleSync();
  
  Serial.println("BattleAura Ready!");
}

void loop() {
  // Handle WebSocket events
  webSocket.loop();
  
  // Check tilt sensor for movement
  checkMovementSensor();
  
  // Handle active effects
  handleActiveEffects();
  
  // Send periodic heartbeat
  sendHeartbeat();
  
  // Small delay to prevent watchdog issues
  delay(10);
}

void initializeHardware() {
  Serial.println("Initializing hardware...");
  
  // Initialize LED pins
  pinMode(BRAZIER_LED, OUTPUT);
  pinMode(COCKPIT_LED, OUTPUT);
  pinMode(ENGINE_STACK_1, OUTPUT);
  pinMode(ENGINE_STACK_2, OUTPUT);
  pinMode(CANDLE_GROUP_1, OUTPUT);
  pinMode(CANDLE_GROUP_2, OUTPUT);
  pinMode(HEAVY_FLAMER_LED, OUTPUT);
  pinMode(HEAVY_MG_LED, OUTPUT);
  
  // Initialize tilt sensor
  pinMode(TILT_SWITCH, INPUT_PULLUP);
  
  // Turn off all LEDs
  setAllLEDs(false);
  
  // Initialize audio if available
  if (audioEnabled) {
    mySoftwareSerial.begin(9600);
    if (myDFPlayer.begin(mySoftwareSerial)) {
      Serial.println("DFPlayer initialized");
      myDFPlayer.volume(20);  // Set volume (0-30)
    } else {
      Serial.println("DFPlayer initialization failed");
      audioEnabled = false;
    }
  }
  
  Serial.println("Hardware initialized");
}

void generateDeviceIdentity() {
  // Use MAC address as unique device ID
  deviceId = WiFi.macAddress();
  deviceId.replace(":", "");  // Remove colons
  
  // Create friendly device name
  deviceName = "BattleAura-" + deviceId.substring(6);  // Use last 6 chars
  
  Serial.println("Device ID: " + deviceId);
  Serial.println("Device Name: " + deviceName);
}

void loadConfiguration() {
  preferences.begin("battlearua", false);
  
  // Load server configuration
  serverAddress = preferences.getString("server", "battlesync.me");
  
  Serial.println("Loaded server: " + serverAddress);
}

void setupWiFi() {
  Serial.println("Setting up WiFi...");
  
  // Add custom server configuration parameter
  WiFiManagerParameter custom_server("server", "BattleSync Server", serverAddress.c_str(), 50);
  wifiManager.addParameter(&custom_server);
  
  // Set callback to save custom parameters
  wifiManager.setSaveParamsCallback(saveCustomParams);
  
  // Create configuration portal if no WiFi credentials
  wifiManager.setConfigPortalTimeout(300);  // 5 minute timeout
  
  if (!wifiManager.autoConnect(deviceName.c_str())) {
    Serial.println("Failed to connect to WiFi");
    delay(3000);
    ESP.restart();
  }
  
  // Save server configuration
  serverAddress = custom_server.getValue();
  preferences.putString("server", serverAddress);
  
  Serial.println("WiFi connected!");
  Serial.println("IP address: " + WiFi.localIP().toString());
  Serial.println("Server: " + serverAddress);
}

void saveCustomParams() {
  Serial.println("Saving custom parameters");
  // Parameters are saved in setupWiFi() after WiFi connection
}

void connectToBattleSync() {
  Serial.println("Connecting to BattleSync server...");
  
  // Parse server address
  String host = serverAddress;
  uint16_t port = 80;
  bool useSSL = false;
  
  // Handle different server formats
  if (serverAddress.startsWith("wss://")) {
    host = serverAddress.substring(6);  // Remove "wss://"
    port = 443;
    useSSL = true;
  } else if (serverAddress.startsWith("ws://")) {
    host = serverAddress.substring(5);   // Remove "ws://"
    port = 80;
  } else if (serverAddress.startsWith("https://")) {
    host = serverAddress.substring(8);   // Remove "https://"
    port = 443;
    useSSL = true;
  } else if (serverAddress.startsWith("http://")) {
    host = serverAddress.substring(7);   // Remove "http://"
    port = 80;
  }
  
  // Handle port in URL
  int colonIndex = host.indexOf(':');
  if (colonIndex > 0) {
    port = host.substring(colonIndex + 1).toInt();
    host = host.substring(0, colonIndex);
  }
  
  // Connect to WebSocket
  if (useSSL) {
    webSocket.beginSSL(host, port, serverPath);
  } else {
    webSocket.begin(host, port, serverPath);
  }
  
  // Set WebSocket event handler
  webSocket.onEvent(webSocketEvent);
  
  // Set heartbeat interval
  webSocket.setReconnectInterval(5000);
  
  Serial.println("WebSocket connection initiated to " + host + ":" + String(port));
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("WebSocket Disconnected");
      isConnected = false;
      setStatusLED(false);
      break;
      
    case WStype_CONNECTED:
      Serial.println("WebSocket Connected to: " + String((char*)payload));
      isConnected = true;
      setStatusLED(true);
      registerDevice();
      break;
      
    case WStype_TEXT:
      Serial.println("Received: " + String((char*)payload));
      handleWebSocketMessage((char*)payload);
      break;
      
    case WStype_BIN:
      Serial.println("Received binary data");
      break;
      
    case WStype_ERROR:
      Serial.println("WebSocket Error");
      break;
      
    case WStype_FRAGMENT_TEXT_START:
    case WStype_FRAGMENT_BIN_START:
    case WStype_FRAGMENT:
    case WStype_FRAGMENT_FIN:
      break;
  }
}

void registerDevice() {
  Serial.println("Registering device with BattleSync...");
  
  DynamicJsonDocument doc(1024);
  doc["type"] = "device_register";
  doc["data"]["deviceId"] = deviceId;
  doc["data"]["name"] = deviceName;
  doc["data"]["capabilities"]["ledCount"] = LED_COUNT;
  doc["data"]["capabilities"]["hasAudio"] = audioEnabled;
  doc["data"]["capabilities"]["hasTiltSensor"] = HAS_TILT_SENSOR;
  doc["data"]["capabilities"]["firmwareVersion"] = FIRMWARE_VERSION;
  doc["data"]["serverAddress"] = serverAddress;
  
  String payload;
  serializeJson(doc, payload);
  
  webSocket.sendTXT(payload);
  Serial.println("Device registration sent");
}

void handleWebSocketMessage(const char* payload) {
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, payload);
  
  if (error) {
    Serial.println("JSON parsing failed: " + String(error.c_str()));
    return;
  }
  
  String messageType = doc["type"];
  
  if (messageType == "device_register") {
    // Registration acknowledgment
    if (doc["data"]["success"]) {
      Serial.println("Device registration successful");
      setStatusLED(true);
    }
  }
  else if (messageType == "battlearua_event") {
    // Battle event for this device
    handleBattleEvent(doc["data"]);
  }
  else if (messageType == "welcome") {
    Serial.println("Received welcome message");
  }
}

void handleBattleEvent(JsonObject eventData) {
  String eventType = eventData["type"];
  String unitId = eventData["unitId"];
  
  // Only process events for units we're assigned to (future enhancement)
  // For now, process all events since device assignment is handled server-side
  
  Serial.println("Processing battle event: " + eventType);
  
  if (eventType == "UNIT_SHOOTING") {
    String weaponName = eventData["battleAura"]["weaponName"];
    int intensity = eventData["battleAura"]["intensity"] | 5;  // Default intensity
    triggerWeaponEffect(weaponName, intensity);
  }
  else if (eventType == "UNIT_DAMAGE") {
    int intensity = eventData["battleAura"]["intensity"] | 5;
    triggerDamageEffect(intensity);
  }
  else if (eventType == "UNIT_ACTIVATION") {
    triggerActivationEffect();
  }
  else if (eventType == "UNIT_MOVEMENT") {
    triggerMovementEffect();
  }
}

void triggerWeaponEffect(String weaponName, int intensity) {
  Serial.println("Weapon effect: " + weaponName + " (intensity: " + String(intensity) + ")");
  
  if (weaponName == "Heavy Flamer") {
    // Red LED strobe + flame sound
    startEffect(2000);  // 2 second effect
    analogWrite(HEAVY_FLAMER_LED, map(intensity, 1, 10, 50, 255));
    if (audioEnabled) myDFPlayer.play(1);  // 001.mp3
    
    // Strobe effect
    for (int i = 0; i < 10; i++) {
      digitalWrite(HEAVY_FLAMER_LED, HIGH);
      delay(100);
      digitalWrite(HEAVY_FLAMER_LED, LOW);
      delay(100);
    }
  }
  else if (weaponName == "Heavy Machine Gun") {
    // Yellow LED rapid flash + MG sound
    startEffect(1500);  // 1.5 second effect
    if (audioEnabled) myDFPlayer.play(2);  // 002.mp3
    
    // Rapid flash effect
    for (int i = 0; i < 15; i++) {
      analogWrite(HEAVY_MG_LED, map(intensity, 1, 10, 100, 255));
      delay(50);
      digitalWrite(HEAVY_MG_LED, LOW);
      delay(50);
    }
  }
  else {
    // Generic weapon effect
    startEffect(1000);
    analogWrite(BRAZIER_LED, map(intensity, 1, 10, 50, 200));
    if (audioEnabled) myDFPlayer.play(3);  // 003.mp3 - generic weapon sound
    delay(1000);
    digitalWrite(BRAZIER_LED, LOW);
  }
}

void triggerDamageEffect(int intensity) {
  Serial.println("Damage effect (intensity: " + String(intensity) + ")");
  
  startEffect(1000);
  
  // Red damage indicators
  int brightness = map(intensity, 1, 10, 50, 255);
  analogWrite(COCKPIT_LED, brightness);
  analogWrite(CANDLE_GROUP_1, brightness / 2);
  analogWrite(CANDLE_GROUP_2, brightness / 2);
  
  // Damage sound
  if (audioEnabled) myDFPlayer.play(10);  // 010.mp3 - damage sound
  
  // Fade effect
  for (int i = brightness; i >= 0; i -= 5) {
    analogWrite(COCKPIT_LED, i);
    analogWrite(CANDLE_GROUP_1, i / 2);
    analogWrite(CANDLE_GROUP_2, i / 2);
    delay(50);
  }
}

void triggerActivationEffect() {
  Serial.println("Activation effect");
  
  startEffect(500);
  
  // Gentle pulse effect
  digitalWrite(BRAZIER_LED, HIGH);
  if (audioEnabled) myDFPlayer.play(5);  // 005.mp3 - ready sound
  delay(500);
  digitalWrite(BRAZIER_LED, LOW);
}

void triggerMovementEffect() {
  Serial.println("Movement effect");
  
  startEffect(300);
  
  // Brief indicator
  digitalWrite(ENGINE_STACK_1, HIGH);
  digitalWrite(ENGINE_STACK_2, HIGH);
  if (audioEnabled) myDFPlayer.play(6);  // 006.mp3 - movement sound
  delay(300);
  digitalWrite(ENGINE_STACK_1, LOW);
  digitalWrite(ENGINE_STACK_2, LOW);
}

void startEffect(unsigned long duration) {
  effectActive = true;
  effectEndTime = millis() + duration;
}

void handleActiveEffects() {
  if (effectActive && millis() > effectEndTime) {
    effectActive = false;
    // Turn off all effect LEDs but keep status LED
    setAllLEDs(false);
    setStatusLED(isConnected);
  }
}

void checkMovementSensor() {
  if (millis() - lastMovementCheck < 100) return;  // Check every 100ms
  lastMovementCheck = millis();
  
  bool currentTiltState = digitalRead(TILT_SWITCH) == LOW;  // Active low
  
  if (currentTiltState != lastTiltState && currentTiltState) {
    // Movement detected
    Serial.println("Movement detected by tilt sensor");
    triggerMovementEffect();
  }
  
  lastTiltState = currentTiltState;
}

void sendHeartbeat() {
  if (millis() - lastHeartbeat < 30000) return;  // Every 30 seconds
  lastHeartbeat = millis();
  
  if (!isConnected) return;
  
  DynamicJsonDocument doc(512);
  doc["type"] = "device_status";
  doc["data"]["deviceId"] = deviceId;
  doc["data"]["status"] = "online";
  doc["data"]["batteryLevel"] = getBatteryLevel();
  doc["data"]["lastActivity"] = millis();
  
  String payload;
  serializeJson(doc, payload);
  
  webSocket.sendTXT(payload);
}

int getBatteryLevel() {
  // Simple battery level estimation (you may want to improve this)
  int rawValue = analogRead(A0);  // Assuming battery voltage divider on A0
  int batteryPercent = map(rawValue, 2800, 4200, 0, 100);  // 2.8V-4.2V range
  return constrain(batteryPercent, 0, 100);
}

void setAllLEDs(bool state) {
  digitalWrite(BRAZIER_LED, state);
  digitalWrite(COCKPIT_LED, state);
  digitalWrite(ENGINE_STACK_1, state);
  digitalWrite(ENGINE_STACK_2, state);
  digitalWrite(CANDLE_GROUP_1, state);
  digitalWrite(CANDLE_GROUP_2, state);
  digitalWrite(HEAVY_FLAMER_LED, state);
  digitalWrite(HEAVY_MG_LED, state);
}

void setStatusLED(bool connected) {
  // Use brazier as status indicator when not in battle
  if (!effectActive) {
    if (connected) {
      // Slow breathing effect when connected
      static unsigned long lastBreathe = 0;
      static int brightness = 0;
      static int direction = 1;
      
      if (millis() - lastBreathe > 50) {
        brightness += direction * 5;
        if (brightness >= 100) {
          brightness = 100;
          direction = -1;
        } else if (brightness <= 0) {
          brightness = 0;
          direction = 1;
        }
        analogWrite(BRAZIER_LED, brightness);
        lastBreathe = millis();
      }
    } else {
      digitalWrite(BRAZIER_LED, LOW);
    }
  }
}