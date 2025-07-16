import { apiClient } from '../services/api';

export interface ConnectionStatus {
  step: string;
  message: string;
  success?: boolean;
  error?: string;
}

export class ConnectionManager {
  private static retryAttempts = 0;
  private static maxRetries = 10;
  private static retryDelay = 2000; // 2 seconds
  private static statusCallback?: (status: ConnectionStatus) => void;

  /**
   * Wait for backend to be available with detailed status updates
   */
  static async waitForBackend(statusCallback?: (status: ConnectionStatus) => void): Promise<{ success: boolean; error?: string; details?: string }> {
    this.statusCallback = statusCallback;
    console.log('🔍 Starting backend connection checks...');
    
    try {
      // Step 1: Check if backend is listening
      this.updateStatus('network', 'Checking if backend server is running...');
      await this.delay(500); // Brief delay to show the message
      
      const networkResult = await this.checkNetworkConnection();
      if (!networkResult.success) {
        return { success: false, error: networkResult.error, details: networkResult.details };
      }
      
      // Step 2: Check health endpoint
      this.updateStatus('health', 'Testing backend health endpoint...');
      await this.delay(500);
      
      const healthResult = await this.checkHealthEndpoint();
      if (!healthResult.success) {
        return { success: false, error: healthResult.error, details: healthResult.details };
      }
      
      // Step 3: Check API accessibility
      this.updateStatus('api', 'Verifying API endpoints...');
      await this.delay(500);
      
      const apiResult = await this.checkApiEndpoints();
      if (!apiResult.success) {
        return { success: false, error: apiResult.error, details: apiResult.details };
      }
      
      // Step 4: Check WebSocket
      this.updateStatus('websocket', 'Testing WebSocket connection...');
      await this.delay(500);
      
      // Don't fail if WebSocket isn't available, just warn
      const wsResult = await this.checkWebSocketConnection();
      if (!wsResult.success) {
        console.warn('WebSocket connection failed, but continuing...');
      }
      
      this.updateStatus('complete', '✅ All systems operational!', true);
      console.log('✅ Backend is fully ready!');
      return { success: true };
      
    } catch (error: any) {
      const errorMsg = 'Unexpected error during connection checks';
      const details = error.message || 'Unknown error occurred';
      this.updateStatus('error', `❌ ${errorMsg}`, false, details);
      return { success: false, error: errorMsg, details };
    }
  }
  
  private static async checkNetworkConnection(): Promise<{ success: boolean; error?: string; details?: string }> {
    let lastError = '';
    let lastDetails = '';
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Try a simple fetch to see if the server is listening
        const response = await fetch('/health', { 
          method: 'GET',
          cache: 'no-cache'
        });
        
        // Any response (even 401) means the server is listening
        this.updateStatus('network', '✅ Backend server is responding');
        return { success: true };
        
      } catch (error: any) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          lastError = 'Connection refused';
          lastDetails = 'Backend server is not running or not accessible';
        } else {
          lastError = 'Network error';
          lastDetails = error.message || 'Cannot reach backend server';
        }
        
        this.updateStatus('network', `⏳ Attempt ${attempt}/${this.maxRetries}: ${lastError}`);
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay);
        }
      }
    }
    
    return { success: false, error: lastError, details: lastDetails };
  }
  
  private static async checkHealthEndpoint(): Promise<{ success: boolean; error?: string; details?: string }> {
    try {
      const response = await apiClient.healthCheck();
      if (response.status === 200) {
        this.updateStatus('health', '✅ Health endpoint responding correctly');
        return { success: true };
      } else {
        return { 
          success: false, 
          error: `HTTP ${response.status}`, 
          details: 'Health endpoint returned unexpected status' 
        };
      }
    } catch (error: any) {
      let errorMsg = 'Health check failed';
      let details = 'Health endpoint is not responding';
      
      if (error.response) {
        errorMsg = `HTTP ${error.response.status}`;
        details = error.response.data?.message || error.response.statusText || 'Health endpoint error';
      } else if (error.code) {
        errorMsg = error.code;
        details = error.message || 'Network error accessing health endpoint';
      }
      
      return { success: false, error: errorMsg, details };
    }
  }
  
  private static async checkApiEndpoints(): Promise<{ success: boolean; error?: string; details?: string }> {
    try {
      // Test a few key endpoints to make sure routing is working
      const testEndpoints = [
        { path: '/health', name: 'Health' },
        { path: '/api/health', name: 'API Health' }
      ];
      
      for (const endpoint of testEndpoints) {
        try {
          const response = await fetch(endpoint.path, { cache: 'no-cache' });
          // Any response (even 401/404) means routing is working
          console.log(`${endpoint.name} endpoint: HTTP ${response.status}`);
        } catch (error) {
          return { 
            success: false, 
            error: 'API routing error', 
            details: `${endpoint.name} endpoint is not accessible` 
          };
        }
      }
      
      this.updateStatus('api', '✅ API endpoints are accessible');
      return { success: true };
      
    } catch (error: any) {
      return { 
        success: false, 
        error: 'API test failed', 
        details: error.message || 'Could not verify API endpoints' 
      };
    }
  }
  
  private static async checkWebSocketConnection(): Promise<{ success: boolean; error?: string; details?: string }> {
    try {
      // Try to create a WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      
      return new Promise((resolve) => {
        const ws = new WebSocket(wsUrl);
        const timeout = setTimeout(() => {
          ws.close();
          resolve({ 
            success: false, 
            error: 'WebSocket timeout', 
            details: 'WebSocket connection timed out' 
          });
        }, 3000);
        
        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          this.updateStatus('websocket', '✅ WebSocket connection available');
          resolve({ success: true });
        };
        
        ws.onerror = () => {
          clearTimeout(timeout);
          resolve({ 
            success: false, 
            error: 'WebSocket error', 
            details: 'WebSocket connection failed' 
          });
        };
      });
      
    } catch (error: any) {
      return { 
        success: false, 
        error: 'WebSocket test failed', 
        details: error.message || 'Could not test WebSocket connection' 
      };
    }
  }
  
  private static updateStatus(step: string, message: string, success?: boolean, error?: string) {
    if (this.statusCallback) {
      this.statusCallback({ step, message, success, error });
    }
    console.log(`[${step.toUpperCase()}] ${message}`);
  }

  /**
   * Check if backend is available (single attempt)
   */
  static async isBackendAvailable(): Promise<boolean> {
    try {
      // Use direct fetch instead of apiClient to avoid dependency issues
      const response = await fetch('/health', { 
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Reset retry counter for fresh attempts
   */
  static resetRetries(): void {
    this.retryAttempts = 0;
    this.retryDelay = 2000;
  }

  /**
   * Simple delay utility
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Show connection status to user
   */
  static showConnectionStatus(isConnected: boolean): void {
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
      statusEl.innerHTML = isConnected 
        ? '<span class="text-green-500">🟢 Connected</span>'
        : '<span class="text-red-500">🔴 Connecting...</span>';
    }
  }
}