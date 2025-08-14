import React, { useState, useEffect } from 'react';
// @ts-ignore - esptool-js doesn't have TypeScript definitions
import { ESPLoader } from 'esptool-js';

interface FirmwareInfo {
  version: string;
  download_url: string;
  changelog?: string;
  released: string;
  file_size: number;
  // Flash metadata
  chip_family?: string;
  flash_size?: string;
  flash_mode?: string;
  flash_freq?: string;
  partition_table?: any;
  bootloader_addr?: string;
  partition_addr?: string;
  app_addr?: string;
}

interface FlashProgress {
  stage: string;
  progress: number;
  message: string;
}

const FirmwareFlashPage: React.FC = () => {
  const [firmwareList, setFirmwareList] = useState<FirmwareInfo[]>([]);
  const [selectedFirmware, setSelectedFirmware] = useState<FirmwareInfo | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState<FlashProgress | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [espLoader, setEspLoader] = useState<any>(null);
  const [isWebSerialSupported, setIsWebSerialSupported] = useState(false);

  useEffect(() => {
    // Check for Web Serial API support
    setIsWebSerialSupported('serial' in navigator);
    
    // Load firmware list
    loadFirmwareList();
  }, []);

  const loadFirmwareList = async () => {
    try {
      const response = await fetch('/api/battleaura/firmware');
      const data = await response.json();
      
      if (data.success) {
        setFirmwareList(data.firmware);
        // Auto-select latest firmware
        if (data.firmware.length > 0) {
          setSelectedFirmware(data.firmware[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load firmware list:', error);
      setError('Failed to load firmware list');
    }
  };

  const connectToDevice = async () => {
    if (!isWebSerialSupported) {
      setError('Web Serial API not supported. Please use Chrome or Edge browser.');
      return;
    }

    try {
      setError(null);
      setFlashProgress({
        stage: 'connect',
        progress: 0,
        message: 'Connecting to device...'
      });
      
      // Request a port and open a connection
      const requestedPort = await (navigator as any).serial.requestPort({
        filters: [
          { usbVendorId: 0x303A }, // Espressif ESP32-C3
          { usbVendorId: 0x10C4 }, // Silicon Labs CP210x
          { usbVendorId: 0x1A86 }  // QinHeng Electronics CH340
        ]
      });

      // Initialize ESPLoader
      const loaderOptions = {
        transport: requestedPort,
        baudrate: 115200,
        romBaudrate: 115200,
        enableTracing: false
      };

      const loader = new ESPLoader(loaderOptions);
      
      // Connect to the device
      await loader.connect();
      
      setEspLoader(loader);
      setIsConnected(true);

      // Detect device info
      await detectDevice(loader);
      
      setFlashProgress(null);

    } catch (error: any) {
      console.error('Connection failed:', error);
      setError(`Connection failed: ${error.message}`);
      setFlashProgress(null);
    }
  };

  const detectDevice = async (loader: any) => {
    try {
      setFlashProgress({
        stage: 'detect',
        progress: 50,
        message: 'Detecting device information...'
      });

      // Get chip info
      const chipName = await loader.getChipDescription();
      const chipFeatures = await loader.getChipFeatures();
      const macAddr = await loader.readMac();
      
      // Get flash size
      await loader.flashId();
      const flashSize = loader.flashSizeBytes;

      setDeviceInfo({
        chipType: chipName,
        chipFeatures: chipFeatures.join(', '),
        flashSize: `${flashSize / (1024 * 1024)}MB`,
        macAddress: macAddr
      });

      setFlashProgress({
        stage: 'detect',
        progress: 100,
        message: 'Device detected successfully'
      });

    } catch (error: any) {
      console.error('Device detection failed:', error);
      setError(`Device detection failed: ${error.message}`);
      
      // Set basic fallback info
      setDeviceInfo({
        chipType: 'ESP32 (Unknown)',
        flashSize: 'Unknown',
        macAddress: 'Unknown'
      });
    }
  };

  const disconnectFromDevice = async () => {
    if (espLoader) {
      try {
        await espLoader.disconnect();
        setEspLoader(null);
        setIsConnected(false);
        setDeviceInfo(null);
        setFlashProgress(null);
      } catch (error) {
        console.error('Disconnect failed:', error);
      }
    }
  };

  const flashFirmware = async () => {
    if (!selectedFirmware || !espLoader) {
      setError('No firmware selected or device not connected');
      return;
    }

    setIsFlashing(true);
    setError(null);
    
    try {
      // Stage 1: Download firmware
      setFlashProgress({
        stage: 'download',
        progress: 0,
        message: 'Downloading firmware...'
      });

      const firmwareResponse = await fetch(selectedFirmware.download_url);
      if (!firmwareResponse.ok) {
        throw new Error(`Failed to download firmware: ${firmwareResponse.status}`);
      }
      
      const firmwareBlob = await firmwareResponse.blob();
      const firmwareBuffer = await firmwareBlob.arrayBuffer();

      setFlashProgress({
        stage: 'download',
        progress: 100,
        message: 'Firmware downloaded successfully'
      });

      // Stage 2: Prepare flash options
      // @ts-ignore - esptool-js type definitions are incomplete
      const flashOptions = {
        fileArray: [{
          data: new Uint8Array(firmwareBuffer),
          address: parseInt(selectedFirmware.app_addr || '0x10000', 16)
        }],
        flashSize: selectedFirmware.flash_size || '4MB',
        flashMode: selectedFirmware.flash_mode || 'dio',
        flashFreq: selectedFirmware.flash_freq || '80m',
        eraseAll: false,
        compress: true,
        reportProgress: (_fileIndex: number, written: number, total: number) => {
          const progress = Math.round((written / total) * 100);
          setFlashProgress({
            stage: 'flash',
            progress,
            message: `Flashing firmware... ${progress}%`
          });
        }
      };

      // Stage 3: Flash the firmware
      setFlashProgress({
        stage: 'prepare',
        progress: 0,
        message: 'Preparing device for flashing...'
      });

      await espLoader.writeFlash(flashOptions);

      // Stage 4: Reset device
      setFlashProgress({
        stage: 'reset',
        progress: 100,
        message: 'Resetting device...'
      });

      await espLoader.hardReset();

      setFlashProgress({
        stage: 'complete',
        progress: 100,
        message: `Successfully flashed ${selectedFirmware.version}!`
      });

    } catch (error: any) {
      console.error('Flash failed:', error);
      setError(`Flash failed: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setIsFlashing(false);
    }
  };


  if (!isWebSerialSupported) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-battle-text-primary-light dark:text-battle-text-primary-dark mb-4">
            ESP32 Firmware Flash
          </h1>
        </div>
        
        <div className="card">
          <h2 className="text-xl font-semibold text-battle-status-routed mb-4">Browser Not Supported</h2>
          <p className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark mb-4">
            Web Serial API is required for flashing firmware. Please use a supported browser:
          </p>
          <ul className="list-disc list-inside text-battle-text-secondary-light dark:text-battle-text-secondary-dark space-y-2">
            <li>Chrome 89+ (recommended)</li>
            <li>Edge 89+</li>
            <li>Opera 76+</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-battle-text-primary-light dark:text-battle-text-primary-dark mb-4">
          ESP32 Firmware Flash
        </h1>
        <p className="text-xl text-battle-text-secondary-light dark:text-battle-text-secondary-dark max-w-3xl mx-auto">
          Flash BattleAura firmware directly to your ESP32 device via USB.
        </p>
      </div>

      {error && (
        <div className="card border-battle-status-routed">
          <p className="text-battle-status-routed font-medium">{error}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Firmware Selection */}
        <div className="card">
          <h2 className="text-xl font-semibold text-battle-accent-primary-light dark:text-battle-accent-primary-dark mb-4">Select Firmware</h2>
            
          {firmwareList.length === 0 ? (
            <p className="text-battle-text-muted-light dark:text-battle-text-muted-dark">Loading firmware versions...</p>
          ) : (
            <div className="space-y-3">
              {firmwareList.map((firmware) => (
                <div
                  key={firmware.version}
                  className={`p-3 rounded border cursor-pointer transition-colors ${
                    selectedFirmware?.version === firmware.version
                      ? 'bg-battle-accent-primary-light/10 dark:bg-battle-accent-primary-dark/10 border-battle-accent-primary-light dark:border-battle-accent-primary-dark'
                      : 'bg-battle-surface-light dark:bg-battle-surface-dark border-battle-border-light dark:border-battle-border-dark hover:border-battle-text-secondary-light dark:hover:border-battle-text-secondary-dark'
                  }`}
                  onClick={() => setSelectedFirmware(firmware)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">v{firmware.version}</h3>
                      <p className="text-sm text-battle-text-secondary-light dark:text-battle-text-secondary-dark mt-1">{firmware.changelog}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device Connection */}
        <div className="card">
          <h2 className="text-xl font-semibold text-battle-accent-primary-light dark:text-battle-accent-primary-dark mb-4">Device Connection</h2>
            
          {!isConnected ? (
            <div className="space-y-4">
              <p className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark">Connect your ESP32 device via USB</p>
              <button
                onClick={connectToDevice}
                className="w-full btn-primary"
                disabled={isFlashing}
              >
                Connect to Device
              </button>
              <div className="text-sm text-battle-text-muted-light dark:text-battle-text-muted-dark">
                <p>Make sure your device is in download mode:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Hold BOOT button</li>
                  <li>Press and release RESET</li>
                  <li>Release BOOT button</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-battle-status-normal/10 border border-battle-status-normal rounded">
                <p className="text-battle-status-normal font-medium">✓ Device Connected</p>
                {deviceInfo && (
                  <div className="mt-2 text-sm text-battle-text-secondary-light dark:text-battle-text-secondary-dark">
                    <div>Chip: {deviceInfo.chipType}</div>
                    <div>Flash: {deviceInfo.flashSize}</div>
                    <div>MAC: {deviceInfo.macAddress}</div>
                    {deviceInfo.chipFeatures && (
                      <div>Features: {deviceInfo.chipFeatures}</div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={flashFirmware}
                  disabled={!selectedFirmware || isFlashing}
                  className="flex-1 btn-primary bg-orange-600 hover:bg-orange-700"
                >
                  {isFlashing ? 'Flashing...' : 'Flash Firmware'}
                </button>
                <button
                  onClick={disconnectFromDevice}
                  disabled={isFlashing}
                  className="btn-secondary"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Flash Progress */}
      {flashProgress && (
        <div className="card">
          <h2 className="text-xl font-semibold text-battle-accent-primary-light dark:text-battle-accent-primary-dark mb-4">Flash Progress</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-battle-text-primary-light dark:text-battle-text-primary-dark">{flashProgress.message}</span>
              <span className="text-battle-accent-primary-light dark:text-battle-accent-primary-dark">{flashProgress.progress}%</span>
            </div>
            
            <div className="w-full bg-battle-border-light dark:bg-battle-border-dark rounded-full h-2">
              <div
                className="bg-battle-accent-primary-light dark:bg-battle-accent-primary-dark h-2 rounded-full transition-all duration-300"
                style={{ width: `${flashProgress.progress}%` }}
              ></div>
            </div>
            
            {flashProgress.stage === 'complete' && (
              <div className="mt-4 p-3 bg-battle-status-normal/10 border border-battle-status-normal rounded">
                <p className="text-battle-status-normal font-medium">✓ Firmware flash completed successfully!</p>
                <p className="text-sm text-battle-text-secondary-light dark:text-battle-text-secondary-dark mt-1">
                  Device should restart automatically with the new firmware.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Firmware Details */}
      {selectedFirmware && (
        <div className="card">
          <h2 className="text-xl font-semibold text-battle-accent-primary-light dark:text-battle-accent-primary-dark mb-4">Selected Firmware Details</h2>
          
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="space-y-2">
                <div><span className="text-battle-text-muted-light dark:text-battle-text-muted-dark">Version:</span> <span className="text-battle-text-primary-light dark:text-battle-text-primary-dark">{selectedFirmware.version}</span></div>
                <div><span className="text-battle-text-muted-light dark:text-battle-text-muted-dark">Size:</span> <span className="text-battle-text-primary-light dark:text-battle-text-primary-dark">{(selectedFirmware.file_size / 1024).toFixed(1)} KB</span></div>
                <div><span className="text-battle-text-muted-light dark:text-battle-text-muted-dark">Released:</span> <span className="text-battle-text-primary-light dark:text-battle-text-primary-dark">{new Date(selectedFirmware.released).toLocaleDateString()}</span></div>
              </div>
            </div>
            <div>
              <div className="space-y-2">
                <div><span className="text-battle-text-muted-light dark:text-battle-text-muted-dark">Chip Family:</span> <span className="text-battle-text-primary-light dark:text-battle-text-primary-dark">{selectedFirmware.chip_family?.toUpperCase() || 'ESP32-C3'}</span></div>
                <div><span className="text-battle-text-muted-light dark:text-battle-text-muted-dark">Flash Size:</span> <span className="text-battle-text-primary-light dark:text-battle-text-primary-dark">{selectedFirmware.flash_size || '4MB'}</span></div>
                <div><span className="text-battle-text-muted-light dark:text-battle-text-muted-dark">Flash Mode:</span> <span className="text-battle-text-primary-light dark:text-battle-text-primary-dark">{selectedFirmware.flash_mode?.toUpperCase() || 'DIO'}</span></div>
              </div>
            </div>
          </div>
          
          {selectedFirmware.changelog && (
            <div className="mt-4">
              <div className="text-battle-text-muted-light dark:text-battle-text-muted-dark mb-2">Changelog:</div>
              <div className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark bg-battle-surface-light dark:bg-battle-surface-dark border border-battle-border-light dark:border-battle-border-dark rounded p-3">
                {selectedFirmware.changelog}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FirmwareFlashPage;