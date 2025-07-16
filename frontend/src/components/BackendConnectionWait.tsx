import React, { useState, useEffect } from 'react';
import { ConnectionManager, ConnectionStatus } from '../utils/connectionManager';

interface BackendConnectionWaitProps {
  children: React.ReactNode;
}

export const BackendConnectionWait: React.FC<BackendConnectionWaitProps> = ({ children }) => {
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<ConnectionStatus[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('starting');

  // Debug logging
  console.log('BackendConnectionWait state:', { 
    isBackendReady, 
    isChecking, 
    error, 
    currentStep 
  });

  useEffect(() => {
    const checkBackend = async () => {
      setIsChecking(true);
      setError(null);
      
      try {
        // First, do a quick check to see if backend is already available
        const isAvailable = await ConnectionManager.isBackendAvailable();
        
        if (isAvailable) {
          setIsBackendReady(true);
          setIsChecking(false);
          return;
        }

        // If not available, wait for it to start with real status updates
        ConnectionManager.resetRetries();
        const result = await ConnectionManager.waitForBackend((status: ConnectionStatus) => {
          setCurrentStep(status.step);
          setCurrentStatus(prev => {
            const newStatus = [...prev];
            const existingIndex = newStatus.findIndex(s => s.step === status.step);
            if (existingIndex >= 0) {
              newStatus[existingIndex] = status;
            } else {
              newStatus.push(status);
            }
            return newStatus;
          });
        });
        
        if (result.success) {
          setIsBackendReady(true);
        } else {
          setError(result.error || 'Backend failed to start');
          setErrorDetails(result.details || 'Please check if the backend container is running.');
        }
      } catch (err) {
        setError('Failed to connect to backend');
        setErrorDetails('Please try again. Check the troubleshooting steps below.');
        console.error('Backend connection error:', err);
      } finally {
        setIsChecking(false);
      }
    };

    checkBackend();
  }, [retryCount]);

  const handleRetry = () => {
    setError(null);
    setErrorDetails(null);
    setCurrentStatus([]);
    setCurrentStep('starting');
    setRetryCount(prev => prev + 1);
  };

  if (isBackendReady) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="text-center">
          {/* Logo/Title */}
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-8">
            BattleSync
          </h1>

          {isChecking ? (
            <>
              {/* Loading Animation */}
              <div className="relative mb-6">
                <div className="w-16 h-16 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white mb-4">
                Starting Backend Services
              </h2>
              
              <p className="text-gray-400 mb-6">
                Please wait while we connect to the backend...
                <br />
                <span className="text-sm">This may take up to 30 seconds on first startup.</span>
              </p>

              {/* Real Progress Indicators */}
              <div className="space-y-3 text-sm">
                {currentStatus.length === 0 ? (
                  <div className="text-gray-500 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span>Initializing connection checks...</span>
                    </div>
                  </div>
                ) : (
                  currentStatus.map((status) => (
                    <div key={status.step} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          status.success === true ? 'bg-green-500' :
                          status.success === false ? 'bg-red-500' :
                          status.step === currentStep ? 'bg-blue-500 animate-pulse' :
                          'bg-gray-500'
                        }`}></div>
                        <span className={`${
                          status.success === true ? 'text-green-400' :
                          status.success === false ? 'text-red-400' :
                          status.step === currentStep ? 'text-blue-400' :
                          'text-gray-500'
                        }`}>
                          {status.message}
                        </span>
                      </div>
                      {status.success === true && (
                        <span className="text-green-400 text-xs">✓</span>
                      )}
                      {status.success === false && (
                        <span className="text-red-400 text-xs">✗</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : error ? (
            <>
              {/* Error State */}
              <div className="w-16 h-16 mx-auto mb-6 text-red-500">
                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h2 className="text-xl font-semibold text-red-400 mb-4">
                Connection Failed
              </h2>
              
              <div className="mb-6 space-y-2">
                <p className="text-red-300 font-medium">
                  {error}
                </p>
                {errorDetails && (
                  <p className="text-gray-400 text-sm">
                    {errorDetails}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                {/* Show diagnostic information */}
                {currentStatus.length > 0 && (
                  <div className="bg-gray-900 rounded p-3 text-xs">
                    <div className="text-gray-400 mb-2">Diagnostic Results:</div>
                    <div className="space-y-1">
                      {currentStatus.map((status) => (
                        <div key={status.step} className="flex items-center justify-between">
                          <span className={`${
                            status.success === true ? 'text-green-400' :
                            status.success === false ? 'text-red-400' :
                            'text-gray-500'
                          }`}>
                            {status.step}: {status.message}
                          </span>
                          <span className={`${
                            status.success === true ? 'text-green-400' :
                            status.success === false ? 'text-red-400' :
                            'text-gray-500'
                          }`}>
                            {status.success === true ? '✓' : status.success === false ? '✗' : '⏳'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleRetry}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Retry Connection
                </button>

                <div className="text-xs text-gray-500 space-y-1">
                  <p><strong>Troubleshooting:</strong></p>
                  <p>• Make sure Docker containers are running: <code className="bg-gray-800 px-1 rounded">docker-compose up</code></p>
                  <p>• Check if backend is accessible: <code className="bg-gray-800 px-1 rounded">curl http://localhost:3001/health</code></p>
                  <p>• View backend logs: <code className="bg-gray-800 px-1 rounded">docker logs battlesync-app-1</code></p>
                  {error === 'HTTP 401' && (
                    <p className="text-yellow-400">• Try clearing browser storage: <code className="bg-gray-800 px-1 rounded">localStorage.clear()</code> in console</p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};