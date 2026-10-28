import React, { useEffect, useState } from 'react';
import { useWebSocketFeed } from '../../context/WebSocketContext';
import { X, Radio, CheckCircle2, RefreshCw } from 'lucide-react';

interface RfidCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUid: (uid: string) => void;
}

export const RfidCaptureModal: React.FC<RfidCaptureModalProps> = ({
  isOpen,
  onClose,
  onSelectUid,
}) => {
  const { lastRfidScan, isConnected } = useWebSocketFeed();
  const [capturedUid, setCapturedUid] = useState<string | null>(null);
  const [manualUid, setManualUid] = useState<string>('');

  useEffect(() => {
    if (isOpen && lastRfidScan) {
      setCapturedUid(lastRfidScan.uid);
    }
  }, [isOpen, lastRfidScan]);

  if (!isOpen) return null;

  const handleUseCaptured = () => {
    if (capturedUid) {
      onSelectUid(capturedUid);
      onClose();
    }
  };

  const handleUseManual = () => {
    if (manualUid.trim()) {
      const norm = manualUid.replace(/[\s-:]/g, '').toUpperCase();
      onSelectUid(norm);
      onClose();
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h3 className="card-title">
              <Radio size={18} color="#2563eb" />
              Capture RFID Tag
            </h3>
            <p className="page-subtitle">Scan tag on Rack A1 (RC522-01) or enter manually</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Live Scanner Capture Section */}
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: capturedUid ? '#f0fdf4' : '#f8fafc',
              border: `1px solid ${capturedUid ? '#86efac' : '#cbd5e1'}`,
              borderRadius: '8px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            {capturedUid ? (
              <>
                <CheckCircle2 size={36} color="#16a34a" />
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d', textTransform: 'uppercase' }}>
                    Tag Detected on Rack A1
                  </div>
                  <div className="tag-mono" style={{ fontSize: '1.25rem', padding: '0.25rem 0.75rem', marginTop: '0.25rem' }}>
                    {capturedUid}
                  </div>
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleUseCaptured}>
                  Use This Scanned UID
                </button>
              </>
            ) : (
              <>
                <div style={{ animation: 'spin 2s linear infinite' }}>
                  <RefreshCw size={28} color="#2563eb" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#0f172a' }}>
                    Waiting for RFID tag...
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Tap physical RFID sticker on Rack A1 RC522 reader
                  </div>
                </div>
                <div className={`live-indicator ${isConnected ? 'live-connected' : 'live-disconnected'}`} style={{ marginTop: '0.25rem' }}>
                  <span className="live-dot" />
                  {isConnected ? 'Reader Online (ESP8266-01)' : 'IoT Hub Offline'}
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>OR ENTER MANUALLY</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
          </div>

          {/* Manual Entry Section */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Manual UID Input (Hex)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. E234A891 or E2 34 A8 91"
                value={manualUid}
                onChange={(e) => setManualUid(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!manualUid.trim()}
                onClick={handleUseManual}
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
