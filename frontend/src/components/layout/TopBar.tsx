import React, { useState, useEffect } from 'react';
import { useWebSocketFeed } from '../../context/WebSocketContext';
import { RfidCaptureModal } from '../common/RfidCaptureModal';
import { Radio, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TopBar: React.FC = () => {
  const { isConnected, lastRfidScan, activeAlertCount } = useWebSocketFeed();
  const [timeStr, setTimeStr] = useState<string>('');
  const [isScanModalOpen, setIsScanModalOpen] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="topbar">
      {/* Physical Hardware Linkage Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#475569' }}>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>Deployment:</span>
          <span className="badge badge-info" style={{ fontWeight: 600 }}>Rack A1</span>
          <span style={{ color: '#cbd5e1' }}>→</span>
          <span className="tag-mono">RC522-01</span>
          <span style={{ color: '#cbd5e1' }}>→</span>
          <span className="tag-mono">ESP8266-01</span>
        </div>
      </div>

      {/* Right Controls & Telemetry */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Latest Scan Live Notification */}
        {lastRfidScan && (
          <div
            onClick={() => navigate(`/rfid`)}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.3rem 0.625rem',
              backgroundColor: lastRfidScan.event_type === 'UNKNOWN' ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${lastRfidScan.event_type === 'UNKNOWN' ? '#fecaca' : '#bbf7d0'}`,
              borderRadius: '6px',
              fontSize: '0.75rem',
            }}
          >
            {lastRfidScan.event_type === 'UNKNOWN' ? (
              <AlertTriangle size={14} color="#dc2626" />
            ) : (
              <CheckCircle size={14} color="#16a34a" />
            )}
            <span style={{ fontWeight: 600, color: '#0f172a' }}>
              {lastRfidScan.event_type === 'UNKNOWN' ? 'Unknown RFID:' : 'RFID Detected:'}
            </span>
            <span className="tag-mono" style={{ fontSize: '0.75rem' }}>{lastRfidScan.uid}</span>
            {lastRfidScan.product_name && (
              <span style={{ color: '#475569', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                ({lastRfidScan.product_name})
              </span>
            )}
          </div>
        )}

        {/* Scan Tag Modal Button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setIsScanModalOpen(true)}
          title="Open RFID Live Reader / Capture Modal"
        >
          <Radio size={14} color="#2563eb" />
          <span>Capture RFID</span>
        </button>

        {/* Live Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
          <Clock size={14} />
          <span>{timeStr}</span>
        </div>

        {/* Hardware Status Pill */}
        <div className={`live-indicator ${isConnected ? 'live-connected' : 'live-disconnected'}`}>
          <span className="live-dot" />
          <span>{isConnected ? 'IoT Server Connected' : 'Server Offline'}</span>
        </div>
      </div>

      <RfidCaptureModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onSelectUid={(uid) => {
          navigate(`/rfid/${uid}`);
        }}
      />
    </header>
  );
};
