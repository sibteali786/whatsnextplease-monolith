import React from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';

export const ConnectionStatusIndicator = () => {
  const { isConnected, reconnectIn } = useNotifications();
  return (
    <div className="flex items-center space-x-2">
      {isConnected ? (
        <div className="flex items-center text-green-500">
          <Bell className="w-6 h-6 mr-1" />
          <span className="text-sm font-semibold">Connected</span>
        </div>
      ) : (
        <div className="flex items-center text-red-500">
          <BellOff className="w-6 h-6 mr-1" />
          <span className="text-sm font-semibold">
            {reconnectIn > 0
              ? `Reconnecting in ${Math.ceil(reconnectIn / 1000)}s...`
              : 'Disconnected'}
          </span>
        </div>
      )}
    </div>
  );
};
