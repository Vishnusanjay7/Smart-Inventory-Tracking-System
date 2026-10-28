import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { RFIDEvent, Alert, InventoryTransaction } from '../types';

export interface LiveWsEvent {
  id: string;
  type: 'RFID_DETECTED' | 'INVENTORY_UPDATED' | 'ALERT_TRIGGERED' | 'ALERT_RESOLVED' | 'DEVICE_HEARTBEAT' | 'DEVICE_OFFLINE';
  timestamp: Date;
  data: any;
}

interface WebSocketContextType {
  isConnected: boolean;
  liveEvents: LiveWsEvent[];
  lastRfidScan: RFIDEvent | null;
  activeAlertCount: number;
  clearEvents: () => void;
  sendPing: () => void;
  clearLastRfidScan: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [liveEvents, setLiveEvents] = useState<LiveWsEvent[]>([]);
  const [lastRfidScan, setLastRfidScan] = useState<RFIDEvent | null>(null);
  const [activeAlertCount, setActiveAlertCount] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const connectWs = () => {
    // Connect to WebSocket endpoint
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // In dev vite proxy or direct 8000
    const wsUrl = `${protocol}//${host}/ws/live`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to Smart Rack Real-Time WebSocket Hub');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'pong') return;

        const newEvent: LiveWsEvent = {
          id: Math.random().toString(36).substring(2, 9),
          type: payload.type,
          timestamp: new Date(),
          data: payload.data,
        };

        setLiveEvents((prev) => [newEvent, ...prev.slice(0, 49)]); // Keep last 50 events

        if (payload.type === 'RFID_DETECTED') {
          setLastRfidScan(payload.data);
        } else if (payload.type === 'ALERT_TRIGGERED') {
          setActiveAlertCount((prev) => prev + 1);
        } else if (payload.type === 'ALERT_RESOLVED') {
          setActiveAlertCount((prev) => Math.max(0, prev - 1));
        }
      } catch (e) {
        console.error('Error parsing WebSocket frame:', e);
      }
    };

    ws.onclose = () => {
      console.warn('WebSocket connection closed. Reconnecting in 3s...');
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWs();
      }, 3000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket encountered error:', err);
      ws.close();
    };
  };

  useEffect(() => {
    connectWs();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const clearEvents = () => setLiveEvents([]);

  const clearLastRfidScan = useCallback(() => {
    setLastRfidScan(null);
  }, []);

  const sendPing = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send('ping');
    }
  };

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        liveEvents,
        lastRfidScan,
        activeAlertCount,
        clearEvents,
        sendPing,
        clearLastRfidScan,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketFeed = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketFeed must be used within a WebSocketProvider');
  }
  return context;
};
