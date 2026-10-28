import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useWebSocketFeed } from '../context/WebSocketContext';
import { InventoryActionModal } from '../components/common/InventoryActionModal';
import { AnalyticsSummary, Device, InventoryTransaction, Alert, TransactionType } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Package,
  Boxes,
  AlertTriangle,
  Radio,
  History,
  Server,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  PlusCircle,
  MinusCircle,
  X,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { liveEvents, isConnected, lastRfidScan, clearLastRfidScan } = useWebSocketFeed();
  const [scanDismissed, setScanDismissed] = useState<boolean>(false);
  const [activeModalProduct, setActiveModalProduct] = useState<{
    productId: number;
    productCode: string;
    productName: string;
    currentStock: number;
    rackCode: string;
    initialOp: TransactionType;
  } | null>(null);
  const [isModalLoading, setIsModalLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (lastRfidScan) {
      setScanDismissed(false);
      // Auto-dismiss the action prompt after 30 seconds if untouched,
      // ensuring options appear only at the time the RFID card is read
      const timer = setTimeout(() => {
        setScanDismissed(true);
        clearLastRfidScan();
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [lastRfidScan, clearLastRfidScan]);

  const handleOpenScanAction = async (opType: TransactionType) => {
    if (!lastRfidScan || !lastRfidScan.product_id) return;
    const currentScan = lastRfidScan;

    setIsModalLoading(true);
    try {
      const prod = await api.getProduct(currentScan.product_id);
      // Immediately dismiss and clear the IN/OUT prompt as the option was chosen
      setScanDismissed(true);
      clearLastRfidScan();
      setActiveModalProduct({
        productId: prod.id,
        productCode: prod.product_id,
        productName: prod.name,
        currentStock: prod.current_quantity,
        rackCode: prod.rack_code || currentScan.rack_code || 'A1',
        initialOp: opType,
      });
    } catch (err) {
      console.error('Error fetching product for scan action modal:', err);
    } finally {
      setIsModalLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const [sumData, devData, txData, alertData] = await Promise.all([
        api.getAnalyticsSummary(),
        api.getDevices(),
        api.getTransactions({ product_id: undefined }),
        api.getAlerts({ status: 'UNRESOLVED' }),
      ]);
      setSummary(sumData);
      setDevices(devData);
      setTransactions(txData.slice(0, 6));
      setAlerts(alertData.slice(0, 4));
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Refresh summary when live inventory or alert event arrives
  useEffect(() => {
    if (liveEvents.length > 0) {
      const latest = liveEvents[0];
      if (['INVENTORY_UPDATED', 'ALERT_TRIGGERED', 'ALERT_RESOLVED', 'DEVICE_OFFLINE'].includes(latest.type)) {
        loadData();
      }
    }
  }, [liveEvents]);

  const handleResolveAlert = async (id: number) => {
    try {
      await api.resolveAlert(id, 'Resolved from Dashboard quick-action');
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const espDevice = devices.find((d) => d.device_id === 'ESP8266-01') || devices[0];
  const rcReader = espDevice?.readers?.[0];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Operations Dashboard</h1>
          <p className="page-subtitle">Real-time Smart Rack telemetry, RFID event stream, and inventory status</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={loadData}>
            Refresh
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/inventory')}>
            <Boxes size={16} />
            <span>Manage Inventory</span>
          </button>
        </div>
      </div>

      {/* Real-time Hardware Scan Action Banner (Phase C1) */}
      {lastRfidScan && !scanDismissed && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            borderRadius: '8px',
            backgroundColor: lastRfidScan.product_id ? '#f0fdf4' : '#fff7ed',
            border: `1.5px solid ${lastRfidScan.product_id ? '#86efac' : '#fdba74'}`,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div
              style={{
                padding: '0.625rem',
                backgroundColor: lastRfidScan.product_id ? '#dcfce7' : '#ffedd5',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Radio size={24} color={lastRfidScan.product_id ? '#16a34a' : '#ea580c'} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: lastRfidScan.product_id ? '#166534' : '#9a3412',
                    letterSpacing: '0.05em',
                  }}
                >
                  {lastRfidScan.product_id ? '📡 Hardware RFID Tag Detected' : '⚠️ Unregistered RFID Tag Detected'}
                </span>
                <span className="tag-mono" style={{ fontSize: '0.75rem' }}>
                  {lastRfidScan.uid}
                </span>
                {lastRfidScan.rack_code && (
                  <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                    • Rack {lastRfidScan.rack_code}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '0.125rem' }}>
                {lastRfidScan.product_id ? (
                  <span>
                    {lastRfidScan.product_name}{' '}
                    <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#64748b' }}>
                      ({lastRfidScan.product_code})
                    </span>
                  </span>
                ) : (
                  <span>Tag is not assigned to any inventory item.</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            {lastRfidScan.product_id ? (
              <>
                <button
                  className="btn btn-primary"
                  style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                  onClick={() => handleOpenScanAction('RECEIVE')}
                  disabled={isModalLoading}
                >
                  <PlusCircle size={16} />
                  <span>IN (Receive)</span>
                </button>
                <button
                  className="btn btn-primary"
                  style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                  onClick={() => handleOpenScanAction('DISPATCH')}
                  disabled={isModalLoading}
                >
                  <MinusCircle size={16} />
                  <span>OUT (Dispatch)</span>
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    const pid = lastRfidScan.product_id;
                    setScanDismissed(true);
                    clearLastRfidScan();
                    navigate(`/products/${pid}`);
                  }}
                >
                  <ExternalLink size={15} />
                  <span>Details</span>
                </button>
              </>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => {
                  setScanDismissed(true);
                  clearLastRfidScan();
                  navigate('/rfid-registry');
                }}
              >
                <span>Register / Assign Tag</span>
              </button>
            )}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setScanDismissed(true);
                clearLastRfidScan();
              }}
              title="Dismiss notification"
              style={{ padding: '0.4rem 0.5rem' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 1. Inventory Summary KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Catalog Products</div>
          <div className="kpi-value-row">
            <div className="kpi-value">{summary?.total_products ?? '--'}</div>
            <Package size={24} color="#2563eb" />
          </div>
          <div className="kpi-subtext">Active SKUs registered in database</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Physical Stock Units</div>
          <div className="kpi-value-row">
            <div className="kpi-value">{summary?.total_quantity ?? '--'}</div>
            <Boxes size={24} color="#16a34a" />
          </div>
          <div className="kpi-subtext">Stored across active shelves</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Low / Critical Stock</div>
          <div className="kpi-value-row">
            <div className="kpi-value" style={{ color: (summary?.low_stock_count || 0) + (summary?.critical_stock_count || 0) > 0 ? '#dc2626' : '#0f172a' }}>
              {(summary?.low_stock_count || 0) + (summary?.critical_stock_count || 0)}
            </div>
            <AlertTriangle size={24} color="#dc2626" />
          </div>
          <div className="kpi-subtext">
            {summary?.critical_stock_count ?? 0} critical, {summary?.low_stock_count ?? 0} low stock
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Active RFID Tags</div>
          <div className="kpi-value-row">
            <div className="kpi-value">{summary?.active_rfid_tags ?? '--'}</div>
            <Radio size={24} color="#0284c7" />
          </div>
          <div className="kpi-subtext">Assigned to physical goods</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Today's Transactions</div>
          <div className="kpi-value-row">
            <div className="kpi-value">{summary?.today_transactions_count ?? 0}</div>
            <History size={24} color="#64748b" />
          </div>
          <div className="kpi-subtext">{summary?.today_rfid_scans_count ?? 0} RFID scan events today</div>
        </div>
      </div>

      {/* 2. Device & Hardware Status Ribbon */}
      <div className="card" style={{ marginBottom: '1.5rem', backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.625rem', backgroundColor: '#eff6ff', borderRadius: '8px' }}>
              <Server size={22} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Hardware Deployment State
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.125rem' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Rack A1</span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                  Reader: <strong style={{ color: '#0f172a' }}>{rcReader?.reader_id || 'RC522-01'}</strong>
                </span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                  IoT Controller: <strong style={{ color: '#0f172a' }}>{espDevice?.device_id || 'ESP8266-01'}</strong>
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ESP8266 IP Address</div>
              <div className="tag-mono">{espDevice?.ip_address || '192.168.1.50'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ESP8266 Heartbeat</div>
              <StatusBadge status={espDevice?.status || 'ONLINE'} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>RC522 Reader</div>
              <StatusBadge status={rcReader?.status || 'CONNECTED'} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Events Stream (Left) + Transactions & Alerts (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Left: Live RFID Activity Feed */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Activity size={18} color="#2563eb" />
              <span>Live RFID Activity Feed</span>
            </div>
            <span className={`live-indicator ${isConnected ? 'live-connected' : 'live-disconnected'}`}>
              <span className="live-dot" />
              {isConnected ? 'Listening' : 'Offline'}
            </span>
          </div>

          {liveEvents.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
              <Radio size={32} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
              <div>No RFID scans detected yet in this session.</div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#94a3b8' }}>
                Tap physical RFID sticker on Rack A1 RC522 reader to see live updates.
              </div>
            </div>
          ) : (
            <div className="live-stream-box">
              {liveEvents.slice(0, 10).map((ev) => (
                <div
                  key={ev.id}
                  className={`live-event-item ${ev.data?.event_type === 'UNKNOWN' ? 'unknown' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.375rem', backgroundColor: ev.data?.event_type === 'UNKNOWN' ? '#fee2e2' : '#eff6ff', borderRadius: '4px' }}>
                      <Radio size={16} color={ev.data?.event_type === 'UNKNOWN' ? '#dc2626' : '#2563eb'} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {ev.type === 'RFID_DETECTED'
                          ? ev.data?.product_name || 'Unregistered RFID Tag'
                          : ev.type.replace('_', ' ')}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                        {ev.data?.uid && <span className="tag-mono" style={{ fontSize: '0.6875rem' }}>{ev.data.uid}</span>}
                        {ev.data?.rack_code && <span>Rack {ev.data.rack_code}</span>}
                        {ev.data?.source && <span>• Src: {ev.data.source}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#94a3b8' }}>
                    {ev.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Unresolved Alerts & Quick Resolve */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <AlertTriangle size={18} color="#dc2626" />
              <span>Unresolved System Alerts</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/alerts')}>
              View All
            </button>
          </div>

          {alerts.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#16a34a', fontSize: '0.875rem' }}>
              <ShieldCheck size={32} color="#16a34a" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 600 }}>All Systems Healthy</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                No active stock deficits or hardware timeouts.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {alerts.map((al) => (
                <div
                  key={al.id}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '6px',
                    backgroundColor: al.severity === 'CRITICAL' ? '#fef2f2' : '#fffbeb',
                    border: `1px solid ${al.severity === 'CRITICAL' ? '#fecaca' : '#fde68a'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <StatusBadge status={al.severity} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                        {al.type.replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#0f172a', fontWeight: 500 }}>
                      {al.message}
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleResolveAlert(al.id)}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Resolve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Recent Transactions Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <History size={18} color="#2563eb" />
            <span>Recent Inventory Transactions</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/transactions')}>
            Full Audit Log
          </button>
        </div>

        <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Product</th>
                <th>Action</th>
                <th>Quantity Change</th>
                <th>Balance</th>
                <th>Rack</th>
                <th>User / Reason</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No recent inventory transactions recorded.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isPos = tx.quantity_change > 0;
                  return (
                    <tr key={tx.id}>
                      <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {new Date(tx.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{tx.product_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{tx.product_code}</div>
                      </td>
                      <td>
                        <span className={`badge ${isPos ? 'badge-success' : 'badge-danger'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: isPos ? '#16a34a' : '#dc2626' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {isPos ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {isPos ? `+${tx.quantity_change}` : tx.quantity_change}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                          {tx.previous_quantity} → <strong>{tx.new_quantity}</strong>
                        </span>
                      </td>
                      <td>
                        <span className="tag-mono">{tx.rack_code}</span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8125rem', color: '#0f172a' }}>{tx.user_name || 'System'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{tx.reason || 'N/A'}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Action Inventory Transaction Modal */}
      {activeModalProduct && (
        <InventoryActionModal
          isOpen={true}
          onClose={() => {
            setActiveModalProduct(null);
            setScanDismissed(true);
            clearLastRfidScan();
          }}
          onSuccess={() => {
            loadData();
            setActiveModalProduct(null);
            setScanDismissed(true);
            clearLastRfidScan();
          }}
          productId={activeModalProduct.productId}
          productCode={activeModalProduct.productCode}
          productName={activeModalProduct.productName}
          currentStock={activeModalProduct.currentStock}
          rackCode={activeModalProduct.rackCode}
          initialOperationType={activeModalProduct.initialOp}
        />
      )}
    </div>
  );
};
