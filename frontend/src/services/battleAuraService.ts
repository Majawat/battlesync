/**
 * BattleAura ESP32 Device Discovery and Management Service
 * 
 * Handles local network discovery of ESP32 devices and communication
 * with BattleSync server for device management.
 */

import { BattleAuraDevice } from '../types/oprBattle';

export class BattleAuraService {
  private static instance: BattleAuraService;
  private discoveredDevices: Map<string, BattleAuraDevice> = new Map();
  private connectedDevices: Map<string, BattleAuraDevice> = new Map();
  
  public static getInstance(): BattleAuraService {
    if (!BattleAuraService.instance) {
      BattleAuraService.instance = new BattleAuraService();
    }
    return BattleAuraService.instance;
  }

  /**
   * Discover BattleAura devices on the local network
   * This runs in the browser and scans the local network range
   */
  async discoverLocalDevices(): Promise<BattleAuraDevice[]> {
    console.log('🔍 Scanning local network for BattleAura devices...');
    
    const devices: BattleAuraDevice[] = [];
    const localIP = await this.getLocalIP();
    
    if (!localIP) {
      console.warn('Could not determine local IP address');
      return devices;
    }

    const networkBase = localIP.substring(0, localIP.lastIndexOf('.'));
    console.log(`📡 Scanning network range: ${networkBase}.100-200`);

    // Create parallel scan promises for speed
    const scanPromises: Promise<BattleAuraDevice | null>[] = [];
    
    // Scan common IP range where ESP32s might be
    for (let i = 100; i <= 200; i++) {
      scanPromises.push(this.checkDeviceAtIP(`${networkBase}.${i}`));
    }

    // Wait for all scans to complete
    const results = await Promise.allSettled(scanPromises);
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        devices.push(result.value);
        this.discoveredDevices.set(result.value.id, result.value);
        console.log(`✅ Found BattleAura device: ${result.value.name} (${result.value.ipAddress})`);
      }
    });

    console.log(`🎯 Discovery complete: Found ${devices.length} BattleAura devices`);
    return devices;
  }

  /**
   * Check if a specific IP address hosts a BattleAura device
   */
  private async checkDeviceAtIP(ip: string): Promise<BattleAuraDevice | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

      const response = await fetch(`http://${ip}/api/identity`, {
        method: 'GET',
        signal: controller.signal,
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const deviceInfo = await response.json();
        
        // Verify this is a BattleAura device
        if (deviceInfo.type === 'BattleAura' && deviceInfo.deviceId && deviceInfo.name) {
          return {
            id: deviceInfo.deviceId,
            name: deviceInfo.name,
            ipAddress: ip,
            status: 'discovered',
            lastSeen: new Date(),
            capabilities: {
              ledCount: deviceInfo.capabilities?.ledCount || 0,
              hasAudio: deviceInfo.capabilities?.hasAudio || false,
              hasTiltSensor: deviceInfo.capabilities?.hasTiltSensor || false,
              batteryLevel: deviceInfo.capabilities?.batteryLevel,
              firmwareVersion: deviceInfo.capabilities?.firmwareVersion || 'unknown'
            }
          };
        }
      }
    } catch (error) {
      // Device not found, not responding, or not a BattleAura device
      // This is expected for most IPs, so we don't log errors
    }
    
    return null;
  }

  /**
   * Get the local IP address of the browser/device
   */
  private async getLocalIP(): Promise<string | null> {
    try {
      // Use WebRTC to get local IP address
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      const localIP = await new Promise<string | null>((resolve) => {
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate;
            const match = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
            if (match && match[1] && !match[1].startsWith('169.254')) {
              pc.close();
              resolve(match[1]);
            }
          }
        };

        // Create data channel to trigger ICE gathering
        pc.createDataChannel('test');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));

        // Timeout after 5 seconds
        setTimeout(() => {
          pc.close();
          resolve(null);
        }, 5000);
      });

      return localIP;
    } catch (error) {
      console.error('Failed to get local IP:', error);
      return null;
    }
  }

  /**
   * Configure a discovered device to connect to BattleSync
   */
  async configureDevice(device: BattleAuraDevice, unitId?: string): Promise<boolean> {
    if (!device.ipAddress) {
      console.error('Device has no IP address');
      return false;
    }

    try {
      console.log(`⚙️ Configuring device ${device.name}...`);

      const configData = {
        serverAddress: window.location.origin.replace('http', 'ws') + '/ws',
        unitId: unitId,
        enableEffects: true
      };

      const response = await fetch(`http://${device.ipAddress}/api/configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
      });

      if (response.ok) {
        await response.json();
        console.log(`✅ Device ${device.name} configured successfully`);
        
        // Update device status
        device.status = 'connecting';
        device.unitId = unitId;
        this.discoveredDevices.set(device.id, device);
        
        return true;
      } else {
        console.error(`Failed to configure device ${device.name}: ${response.statusText}`);
        return false;
      }
    } catch (error) {
      console.error(`Error configuring device ${device.name}:`, error);
      return false;
    }
  }

  /**
   * Test effects on a specific device
   */
  async testDeviceEffect(device: BattleAuraDevice, effect: string, weaponName?: string): Promise<boolean> {
    if (!device.ipAddress) {
      console.error('Device has no IP address');
      return false;
    }

    try {
      console.log(`🧪 Testing ${effect} effect on ${device.name}...`);

      const testData = {
        effect: effect,
        weaponName: weaponName,
        intensity: 7,  // Medium intensity for testing
        duration: 2000 // 2 second test
      };

      const response = await fetch(`http://${device.ipAddress}/api/test-effect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        console.log(`✅ Test effect sent to ${device.name}`);
        return true;
      } else {
        console.error(`Failed to test effect on ${device.name}: ${response.statusText}`);
        return false;
      }
    } catch (error) {
      console.error(`Error testing effect on ${device.name}:`, error);
      return false;
    }
  }

  /**
   * Get list of discovered devices
   */
  getDiscoveredDevices(): BattleAuraDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  /**
   * Get list of connected devices (from WebSocket)
   */
  getConnectedDevices(): BattleAuraDevice[] {
    return Array.from(this.connectedDevices.values());
  }

  /**
   * Update device status from WebSocket events
   */
  updateDeviceStatus(deviceId: string, status: BattleAuraDevice['status'], device?: Partial<BattleAuraDevice>): void {
    // Update discovered devices
    const discoveredDevice = this.discoveredDevices.get(deviceId);
    if (discoveredDevice) {
      discoveredDevice.status = status;
      discoveredDevice.lastSeen = new Date();
      if (device) {
        Object.assign(discoveredDevice, device);
      }
      this.discoveredDevices.set(deviceId, discoveredDevice);
    }

    // Update connected devices
    if (status === 'online' && device) {
      const connectedDevice: BattleAuraDevice = {
        id: deviceId,
        name: device.name || `BattleAura-${deviceId}`,
        status: 'online',
        lastSeen: new Date(),
        capabilities: device.capabilities || {
          ledCount: 0,
          hasAudio: false,
          hasTiltSensor: false,
          firmwareVersion: 'unknown'
        },
        ...device
      };
      this.connectedDevices.set(deviceId, connectedDevice);
    } else if (status === 'offline') {
      this.connectedDevices.delete(deviceId);
    }
  }

  /**
   * Assign a device to a specific unit
   */
  async assignDeviceToUnit(deviceId: string, unitId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/battlearua/assign-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          deviceId,
          unitId
        })
      });

      if (response.ok) {
        // Update local device records
        const discoveredDevice = this.discoveredDevices.get(deviceId);
        if (discoveredDevice) {
          discoveredDevice.unitId = unitId;
          this.discoveredDevices.set(deviceId, discoveredDevice);
        }

        const connectedDevice = this.connectedDevices.get(deviceId);
        if (connectedDevice) {
          connectedDevice.unitId = unitId;
          this.connectedDevices.set(deviceId, connectedDevice);
        }

        console.log(`✅ Device ${deviceId} assigned to unit ${unitId}`);
        return true;
      } else {
        console.error('Failed to assign device to unit');
        return false;
      }
    } catch (error) {
      console.error('Error assigning device to unit:', error);
      return false;
    }
  }

  /**
   * Clear all discovered devices (for re-scanning)
   */
  clearDiscoveredDevices(): void {
    this.discoveredDevices.clear();
  }
}

// Export singleton instance
export const battleAuraService = BattleAuraService.getInstance();