import React from 'react';
import { Bell, BellOff, Wifi, Smartphone } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';

export const ConnectionStatusIndicator = () => {
  const { sseConnected, pushEnabled, manualReconnect } = useNotifications();

  // Determine overall connection status
  const getConnectionStatus = () => {
    if (sseConnected && pushEnabled) {
      return {
        status: 'optimal',
        icon: Bell,
        color: 'text-green-500',
        message: 'Real-time notifications active',
      };
    } else if (sseConnected && !pushEnabled) {
      return {
        status: 'sse-only',
        icon: Wifi,
        color: 'text-blue-500',
        message: 'Real-time',
      };
    } else if (!sseConnected && pushEnabled) {
      return {
        status: 'push-only',
        icon: Smartphone,
        color: 'text-yellow-500',
        message: 'Background notifications only',
      };
    } else {
      return {
        status: 'disconnected',
        icon: BellOff,
        color: 'text-red-500',
        message: 'No notification service',
      };
    }
  };

  const connectionInfo = getConnectionStatus();
  const IconComponent = connectionInfo.icon;

  return (
    <div className="flex items-center space-x-2">
      <div className={`flex items-center ${connectionInfo.color}`}>
        <IconComponent className="w-5 h-5 mr-2" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold">
            {connectionInfo.status === 'optimal' && 'Connected'}
            {connectionInfo.status === 'sse-only' && 'Real-time'}
            {connectionInfo.status === 'push-only' && 'Background'}
            {connectionInfo.status === 'disconnected' && 'Offline'}
          </span>
          <span className="text-xs opacity-75">{connectionInfo.message}</span>
        </div>
      </div>

      {/* Show reconnect button only when SSE is down but push is available */}
      {!sseConnected && pushEnabled && (
        <button
          onClick={manualReconnect}
          className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          title="Reconnect real-time notifications"
        >
          Reconnect
        </button>
      )}

      {/* Show warning when neither connection is available */}
      {!sseConnected && !pushEnabled && (
        <button
          onClick={manualReconnect}
          className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          title="Retry connection"
        >
          Retry
        </button>
      )}
    </div>
  );
};
