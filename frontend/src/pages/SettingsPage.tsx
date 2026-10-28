import React, { useState } from 'react';
import { useWebSocketFeed } from '../context/WebSocketContext';
import {
  Settings,
  Shield,
  Clock,
  Radio,
  Server,
  Save,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [debounceSeconds, setDebounceSeconds] = useState<number>(3.0);
  const [timeoutSeconds, setTimeoutSeconds] = useState<number>(60);
  const [criticalStockDefault, setCriticalStockDefault] = useState<number>(2);
  const [saved, setSaved] = useState<boolean>(false);

  const { isConnected, sendPing } = useWebSocketFeed();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">System Settings & IoT Gateway Configuration</h1>
          <p className="page-subtitle">Configure RFID hardware debounce thresholds, device heartbeats, and default safety rules</p>
        </div>
      </div>

      {saved && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#15803d', fontSize: '0.8125rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={16} />
          <span>Configuration parameters updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Card 1: Hardware Timing */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <div className="card-title">
              <Clock size={18} color="#2563eb" />
              <span>RFID Debounce & Heartbeat Watchdogs</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">RFID Scan Debounce Window (Seconds)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="10.0"
                className="form-input"
                value={debounceSeconds}
                onChange={(e) => setDebounceSeconds(parseFloat(e.target.value) || 3.0)}
              />
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                Suppresses duplicate detections when an item remains resting on the RC522 antenna.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Device Offline Timeout (Seconds)</label>
              <input
                type="number"
                min="15"
                max="300"
                className="form-input"
                value={timeoutSeconds}
                onChange={(e) => setTimeoutSeconds(parseInt(e.target.value) || 60)}
              />
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                Triggers an automatic <code>DEVICE_OFFLINE</code> alert if no heartbeat arrives.
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Security & Hardware Keys */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <div className="card-title">
              <Shield size={18} color="#16a34a" />
              <span>IoT Device Authentication Key</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Active Hardware API Key (ESP8266 REST Header)</label>
            <input
              type="text"
              className="form-input"
              readOnly
              value="SR-IOT-DEVICE-KEY-98421-ESP8266-A1"
              style={{ backgroundColor: '#f8fafc', color: '#334155', fontFamily: 'var(--font-mono)' }}
            />
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              Used in the <code>X-Device-API-Key</code> HTTP header in Arduino firmware.
            </div>
          </div>
        </div>

        {/* Card 3: WebSocket Connectivity Diagnostic */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <div className="card-title">
              <Radio size={18} color="#0284c7" />
              <span>Real-Time WebSocket Diagnostics</span>
            </div>
            <span className={`live-indicator ${isConnected ? 'live-connected' : 'live-disconnected'}`}>
              <span className="live-dot" />
              {isConnected ? 'Socket Active' : 'Socket Disconnected'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.8125rem', color: '#475569' }}>
              Test channel bidirectional latency and live subscription heartbeat.
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={sendPing}>
              Send Ping Frame
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary">
            <Save size={16} />
            <span>Save Configuration Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
