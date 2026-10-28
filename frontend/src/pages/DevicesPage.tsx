import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Device, Product } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { useWebSocketFeed } from '../context/WebSocketContext';
import {
  Server,
  Radio,
  Wifi,
  Clock,
  Shield,
  Activity,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FlaskConical
} from 'lucide-react';

export const DevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'devices' | 'simulator'>('devices');

  // Simulator State
  const [simUid, setSimUid] = useState<string>('E234A891');
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState<boolean>(false);

  const { liveEvents, isConnected } = useWebSocketFeed();

  const loadData = async () => {
    setLoading(true);
    try {
      const [devData, prodData] = await Promise.all([
        api.getDevices(),
        api.getProducts(),
      ]);
      setDevices(devData);
      setProducts(prodData);
    } catch (err) {
      console.error('Failed to load device telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update live on heartbeat or device status change
  useEffect(() => {
    if (liveEvents.length > 0) {
      const latest = liveEvents[0];
      if (['DEVICE_HEARTBEAT', 'DEVICE_OFFLINE', 'RFID_DETECTED'].includes(latest.type)) {
        loadData();
      }
    }
  }, [liveEvents]);

  const handleSimulateScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simUid.trim()) return;
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await api.simulateScan({
        rfid_uid: simUid.trim().toUpperCase(),
        device_id: 'ESP8266-01',
        reader_id: 'RC522-01',
        rack_code: 'A1',
      });
      setSimResult(res);
    } catch (err: any) {
      setSimResult({ error: err.response?.data?.detail || 'Simulation error' });
    } finally {
      setSimLoading(false);
    }
  };

  const dev = devices.find((d) => d.device_id === 'ESP8266-01') || devices[0];
  const reader = dev?.readers?.[0];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">IoT Device & Reader Infrastructure</h1>
          <p className="page-subtitle">Manage ESP8266 controller health, RC522 antenna status, and development testing tools</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={loadData}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          className={`btn ${activeTab === 'devices' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('devices')}
        >
          <Server size={14} />
          <span>Physical Hardware Telemetry</span>
        </button>
        <button
          className={`btn ${activeTab === 'simulator' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('simulator')}
        >
          <FlaskConical size={14} />
          <span>Development Simulator</span>
        </button>
      </div>

      {activeTab === 'devices' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Left: ESP8266 Controller Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Server size={18} color="#2563eb" />
                <span>IoT Hub: {dev?.device_id || 'ESP8266-01'}</span>
              </div>
              <StatusBadge status={dev?.status || 'ONLINE'} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Device Model</div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{dev?.type || 'ESP8266 NodeMCU'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>IP Address</div>
                  <div className="tag-mono">{dev?.ip_address || '192.168.1.50'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Firmware Version</div>
                  <div className="tag-mono">v{dev?.firmware_version || '1.0.0'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Gateway Port</div>
                  <div className="tag-mono">:8000 REST</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={16} color="#64748b" />
                  <span style={{ fontSize: '0.8125rem', color: '#475569' }}>Last Heartbeat Ping</span>
                </div>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                  {dev?.last_heartbeat ? new Date(dev.last_heartbeat).toLocaleTimeString() : 'Active'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={16} color="#16a34a" />
                  <span style={{ fontSize: '0.8125rem', color: '#475569' }}>Device Auth Key</span>
                </div>
                <span className="tag-mono" style={{ fontSize: '0.75rem' }}>Configured Header</span>
              </div>
            </div>
          </div>

          {/* Right: RC522 Reader Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Radio size={18} color="#0284c7" />
                <span>RFID Reader: {reader?.reader_id || 'RC522-01'}</span>
              </div>
              <StatusBadge status={reader?.status || 'CONNECTED'} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Frequency / Protocol</div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>13.56 MHz (SPI)</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Mounted Location</div>
                  <div className="tag-mono">Rack A1 Shelf</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Debounce Window</div>
                  <div className="tag-mono">3.0 Seconds</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Associated Controller</div>
                  <div className="tag-mono">{reader?.device_id || 'ESP8266-01'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={16} color="#64748b" />
                  <span style={{ fontSize: '0.8125rem', color: '#475569' }}>Reader State</span>
                </div>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#16a34a' }}>
                  Listening for tags...
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={16} color="#64748b" />
                  <span style={{ fontSize: '0.8125rem', color: '#475569' }}>Last Read Timestamp</span>
                </div>
                <span style={{ fontSize: '0.8125rem', color: '#0f172a' }}>
                  {reader?.last_seen ? new Date(reader.last_seen).toLocaleTimeString() : 'Ready'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Development Simulator Tab (Demarcated per Rule 41) */
        <div style={{ maxWidth: '700px' }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <FlaskConical size={18} color="#d97706" />
                <span>Development RFID Scanner Simulator</span>
              </div>
              <span className="badge badge-warning">DEVELOPMENT_SIMULATOR</span>
            </div>

            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '0.8125rem', color: '#92400e', marginBottom: '1.25rem' }}>
              <strong>Notice:</strong> Events triggered from this tool are explicitly tagged as <code>DEVELOPMENT_SIMULATOR</code> in the database. 
              They enable end-to-end testing of WebSocket feeds, product matching, and stockout alerts without physical hardware.
            </div>

            <form onSubmit={handleSimulateScan}>
              <div className="form-group">
                <label className="form-label">Select Registered Test Product UID</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  {products.filter((p) => p.rfid_uid).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`btn btn-secondary btn-sm ${simUid === p.rfid_uid ? 'active' : ''}`}
                      onClick={() => setSimUid(p.rfid_uid || '')}
                    >
                      <span>{p.product_id} ({p.name.substring(0, 15)}...)</span>
                      <span className="tag-mono">{p.rfid_uid}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ borderColor: '#fca5a5', color: '#b91c1c' }}
                    onClick={() => setSimUid('99AA88BB')}
                  >
                    <span>Test Unknown Tag (99AA88BB)</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Simulated RFID Hex String</label>
                <input
                  type="text"
                  className="form-input"
                  value={simUid}
                  onChange={(e) => setSimUid(e.target.value.replace(/[\s-:]/g, '').toUpperCase())}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={simLoading}>
                <Play size={14} />
                <span>{simLoading ? 'Simulating...' : 'Dispatch Simulated Hardware Scan'}</span>
              </button>
            </form>

            {simResult && (
              <div style={{ marginTop: '1.25rem', padding: '1rem', backgroundColor: simResult.error ? '#fef2f2' : '#f0fdf4', border: `1px solid ${simResult.error ? '#fecaca' : '#bbf7d0'}`, borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: simResult.error ? '#dc2626' : '#15803d', marginBottom: '0.25rem' }}>
                  {simResult.error ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                  <span>{simResult.error ? 'Simulation Error' : 'Simulated Scan Processed'}</span>
                </div>
                <pre style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', overflowX: 'auto', margin: 0 }}>
                  {JSON.stringify(simResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
