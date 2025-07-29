import React, { useState, useEffect } from 'react';
import { BattleAuraDevice, OPRBattleUnit } from '../types/oprBattle';
import { battleAuraService } from '../services/battleAuraService';

interface BattleAuraSetupProps {
  battleUnits: OPRBattleUnit[];
  onDeviceAssignment?: (deviceId: string, unitId: string) => void;
}

export const BattleAuraSetup: React.FC<BattleAuraSetupProps> = ({
  battleUnits,
  onDeviceAssignment
}) => {
  const [discoveredDevices, setDiscoveredDevices] = useState<BattleAuraDevice[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<BattleAuraDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [testingDevice, setTestingDevice] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    // Load initially connected devices
    loadConnectedDevices();
  }, []);

  const loadConnectedDevices = () => {
    const devices = battleAuraService.getConnectedDevices();
    setConnectedDevices(devices);
  };

  const scanForDevices = async () => {
    setScanning(true);
    try {
      const devices = await battleAuraService.discoverLocalDevices();
      setDiscoveredDevices(devices);
    } catch (error) {
      console.error('Device discovery failed:', error);
    } finally {
      setScanning(false);
    }
  };

  const configureDevice = async (device: BattleAuraDevice) => {
    try {
      const success = await battleAuraService.configureDevice(device);
      if (success) {
        // Device will connect via WebSocket, update will come through WebSocket events
        console.log(`Device ${device.name} configured successfully`);
      }
    } catch (error) {
      console.error('Failed to configure device:', error);
    }
  };

  const testEffect = async (device: BattleAuraDevice, effect: string, weaponName?: string) => {
    setTestingDevice(device.id);
    try {
      await battleAuraService.testDeviceEffect(device, effect, weaponName);
      // Visual feedback that test was sent
      setTimeout(() => setTestingDevice(null), 2000);
    } catch (error) {
      console.error('Failed to test effect:', error);
      setTestingDevice(null);
    }
  };

  const assignDevice = async (deviceId: string, unitId: string) => {
    try {
      const success = await battleAuraService.assignDeviceToUnit(deviceId, unitId);
      if (success && onDeviceAssignment) {
        onDeviceAssignment(deviceId, unitId);
      }
      // Reload connected devices to reflect assignment
      loadConnectedDevices();
    } catch (error) {
      console.error('Failed to assign device:', error);
    }
  };

  const getUnitName = (unitId?: string): string => {
    if (!unitId) return 'Unassigned';
    const unit = battleUnits.find(u => u.unitId === unitId);
    return unit ? (unit.customName || unit.name) : 'Unknown Unit';
  };

  const getStatusColor = (status: BattleAuraDevice['status']): string => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'discovered': return 'bg-blue-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: BattleAuraDevice['status']): string => {
    switch (status) {
      case 'online': return 'Online';
      case 'connecting': return 'Connecting...';
      case 'discovered': return 'Discovered';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  return (
    <div className="bg-gray-700 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <span className="mr-2">⚡</span>
          BattleAura FX
        </h3>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
        >
          {showAdvanced ? 'Hide Setup' : 'Setup Effects'}
        </button>
      </div>

      {showAdvanced && (
        <>
          {/* Step 1: Device Discovery */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-md font-medium text-white">📡 Discover Local Devices</h4>
              <button
                onClick={scanForDevices}
                disabled={scanning}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {scanning ? 'Scanning...' : 'Scan Network'}
              </button>
            </div>
            
            <div className="text-sm text-gray-300 mb-3">
              Make sure your ESP32 devices are powered on and connected to the same WiFi network.
            </div>

            {scanning && (
              <div className="bg-gray-600 rounded p-3 mb-3">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
                  <span className="text-sm text-gray-300">Scanning local network for BattleAura devices...</span>
                </div>
              </div>
            )}

            {discoveredDevices.length > 0 && (
              <div className="space-y-2">
                {discoveredDevices.map(device => (
                  <div key={device.id} className="flex items-center justify-between p-3 bg-gray-600 rounded">
                    <div className="flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-3 ${getStatusColor(device.status)}`}></span>
                      <div>
                        <div className="text-white font-medium">{device.name}</div>
                        <div className="text-sm text-gray-400">
                          {device.ipAddress} • {getStatusText(device.status)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {device.capabilities.ledCount} LEDs • 
                          {device.capabilities.hasAudio ? ' Audio' : ' No Audio'} • 
                          {device.capabilities.hasTiltSensor ? ' Tilt Sensor' : ' No Tilt'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => configureDevice(device)}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    >
                      Configure
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!scanning && discoveredDevices.length === 0 && (
              <div className="bg-gray-600 rounded p-3 text-center">
                <div className="text-gray-300 text-sm">
                  No BattleAura devices found. 
                  <button 
                    onClick={() => window.open('/esp32-system/docs/troubleshooting.md', '_blank')}
                    className="text-blue-400 hover:text-blue-300 ml-1"
                  >
                    Need help?
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Connected Devices */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-white mb-3">🔗 Connected Devices</h4>
            
            {connectedDevices.length > 0 ? (
              <div className="space-y-2">
                {connectedDevices.map(device => (
                  <div key={device.id} className="p-3 bg-gray-600 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className={`w-3 h-3 rounded-full mr-3 ${getStatusColor(device.status)}`}></span>
                        <div>
                          <div className="text-white font-medium">{device.name}</div>
                          <div className="text-sm text-gray-400">
                            {device.capabilities.batteryLevel && `${device.capabilities.batteryLevel}% battery • `}
                            Firmware {device.capabilities.firmwareVersion}
                          </div>
                        </div>
                      </div>
                      <select
                        value={device.unitId || ''}
                        onChange={(e) => assignDevice(device.id, e.target.value)}
                        className="bg-gray-700 text-white rounded px-2 py-1 text-sm border border-gray-600"
                      >
                        <option value="">Select Unit...</option>
                        {battleUnits.map(unit => (
                          <option key={unit.unitId} value={unit.unitId}>
                            {unit.customName || unit.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {device.unitId && (
                      <div className="text-sm text-green-400 mb-2">
                        ✅ Assigned to: {getUnitName(device.unitId)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-600 rounded p-3 text-center">
                <div className="text-gray-300 text-sm">
                  No devices connected. Discover and configure devices above.
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Test Effects */}
          {connectedDevices.filter(d => d.unitId).length > 0 && (
            <div className="mb-4">
              <h4 className="text-md font-medium text-white mb-3">🧪 Test Effects</h4>
              
              <div className="space-y-2">
                {connectedDevices.filter(d => d.unitId).map(device => {
                  const unit = battleUnits.find(u => u.unitId === device.unitId);
                  return (
                    <div key={device.id} className="p-3 bg-gray-600 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <div className="text-white font-medium">{device.name}</div>
                          <div className="text-sm text-gray-400">→ {getUnitName(device.unitId)}</div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => testEffect(device, 'WEAPON_FIRE', 'Heavy Flamer')}
                            disabled={testingDevice === device.id}
                            className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm disabled:opacity-50"
                          >
                            🔥 Flamer
                          </button>
                          <button
                            onClick={() => testEffect(device, 'WEAPON_FIRE', 'Heavy Machine Gun')}
                            disabled={testingDevice === device.id}
                            className="px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm disabled:opacity-50"
                          >
                            🔫 MG
                          </button>
                          <button
                            onClick={() => testEffect(device, 'DAMAGE_TAKEN')}
                            disabled={testingDevice === device.id}
                            className="px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm disabled:opacity-50"
                          >
                            💥 Damage
                          </button>
                          <button
                            onClick={() => testEffect(device, 'ACTIVATION')}
                            disabled={testingDevice === device.id}
                            className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:opacity-50"
                          >
                            ✨ Ready
                          </button>
                        </div>
                      </div>
                      
                      {testingDevice === device.id && (
                        <div className="text-xs text-blue-400">
                          🧪 Testing effect... Check your miniature!
                        </div>
                      )}

                      {unit && unit.weaponSummary && unit.weaponSummary.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Unit weapons: {unit.weaponSummary.map(w => w.name).join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Help Section */}
          <div className="bg-gray-600 rounded p-3">
            <div className="text-sm text-gray-300">
              <strong>💡 Quick Setup:</strong>
              <ol className="mt-1 ml-4 list-decimal">
                <li>Power on your ESP32 miniature</li>
                <li>Connect to "BattleAura-Setup" WiFi network</li>
                <li>Configure your home WiFi and server settings</li>
                <li>Return here and click "Scan Network"</li>
                <li>Configure and assign devices to units</li>
                <li>Test effects to verify everything works!</li>
              </ol>
            </div>
          </div>
        </>
      )}

      {/* Summary when collapsed */}
      {!showAdvanced && (
        <div className="text-sm text-gray-300">
          <div className="flex items-center justify-between">
            <span>
              {connectedDevices.length > 0 
                ? `${connectedDevices.length} device${connectedDevices.length !== 1 ? 's' : ''} connected`
                : 'No devices connected'
              }
            </span>
            {connectedDevices.filter(d => d.unitId).length > 0 && (
              <span className="text-green-400">
                ⚡ {connectedDevices.filter(d => d.unitId).length} assigned to units
              </span>
            )}
          </div>
          
          {connectedDevices.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {connectedDevices.map(device => (
                <div key={device.id} className="flex items-center text-xs bg-gray-600 rounded px-2 py-1">
                  <span className={`w-2 h-2 rounded-full mr-1 ${getStatusColor(device.status)}`}></span>
                  {device.name}
                  {device.unitId && (
                    <span className="ml-1 text-green-400">→ {getUnitName(device.unitId)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};