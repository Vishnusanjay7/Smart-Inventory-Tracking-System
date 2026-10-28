import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Alert } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { useWebSocketFeed } from '../context/WebSocketContext';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState<{ [key: number]: string }>({});

  const { liveEvents } = useWebSocketFeed();

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.getAlerts({
        status: selectedStatus || undefined,
        severity: selectedSeverity || undefined,
      });
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [selectedStatus, selectedSeverity]);

  useEffect(() => {
    if (liveEvents.length > 0 && ['ALERT_TRIGGERED', 'ALERT_RESOLVED'].includes(liveEvents[0].type)) {
      loadAlerts();
    }
  }, [liveEvents]);

  const handleResolve = async (id: number) => {
    const note = resolutionNotes[id] || 'Manually verified and resolved by operator';
    try {
      await api.resolveAlert(id, note);
      await loadAlerts();
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">System Alert Management</h1>
          <p className="page-subtitle">Real-time alerts for stock shortages, unknown RFID tags, and hardware timeouts</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={loadAlerts}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ maxWidth: '200px' }}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="UNRESOLVED">Unresolved Only</option>
            <option value="RESOLVED">Resolved Only</option>
          </select>

          <select
            className="form-select"
            style={{ maxWidth: '200px' }}
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical Severity</option>
            <option value="WARNING">Warning Severity</option>
            <option value="INFO">Info Severity</option>
          </select>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Severity</th>
              <th>Alert Classification</th>
              <th>Message / Description</th>
              <th>Status</th>
              <th>Resolution Info</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  Loading alerts list...
                </td>
              </tr>
            ) : alerts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <CheckCircle size={32} color="#16a34a" style={{ margin: '0 auto 0.5rem' }} />
                  <div>No alerts matching the selected filters.</div>
                </td>
              </tr>
            ) : (
              alerts.map((al) => (
                <tr key={al.id} style={{ backgroundColor: al.status === 'UNRESOLVED' && al.severity === 'CRITICAL' ? '#fffafb' : undefined }}>
                  <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {new Date(al.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td>
                    <StatusBadge status={al.severity} />
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#0f172a' }}>
                      {al.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8125rem', color: '#334155', maxWidth: '380px' }}>
                      {al.message}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={al.status} />
                  </td>
                  <td>
                    {al.status === 'RESOLVED' ? (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        <div>By: <strong>{al.resolver_name || 'Admin'}</strong></div>
                        <div>{al.resolved_at ? new Date(al.resolved_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}</div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>Action Required</span>
                    )}
                  </td>
                  <td>
                    {al.status === 'UNRESOLVED' ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleResolve(al.id)}
                      >
                        Resolve Alert
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle size={14} /> Closed
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
