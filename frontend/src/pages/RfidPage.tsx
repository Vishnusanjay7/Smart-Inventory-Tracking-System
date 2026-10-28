import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { RFIDTag, RFIDEvent } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { useWebSocketFeed } from '../context/WebSocketContext';
import {
  Radio,
  Search,
  Activity,
  RefreshCw,
  Tag,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  SlidersHorizontal
} from 'lucide-react';

export const RfidPage: React.FC = () => {
  const { uid: paramUid } = useParams<{ uid: string }>();
  const [tags, setTags] = useState<RFIDTag[]>([]);
  const [events, setEvents] = useState<RFIDEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>(paramUid || '');
  const [activeTab, setActiveTab] = useState<'tags' | 'events'>('tags');

  const { liveEvents, isConnected } = useWebSocketFeed();
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [tagData, eventData] = await Promise.all([
        api.getTags(),
        api.getEvents(),
      ]);
      setTags(tagData);
      setEvents(eventData);
    } catch (err) {
      console.error('Failed to load RFID data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update live when new RFID scan arrives
  useEffect(() => {
    if (liveEvents.length > 0 && liveEvents[0].type === 'RFID_DETECTED') {
      loadData();
    }
  }, [liveEvents]);

  const filteredTags = tags.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      t.uid.toLowerCase().includes(s) ||
      (t.product_name && t.product_name.toLowerCase().includes(s)) ||
      (t.product_code && t.product_code.toLowerCase().includes(s))
    );
  });

  const filteredEvents = events.filter((ev) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      ev.uid.toLowerCase().includes(s) ||
      (ev.product_name && ev.product_name.toLowerCase().includes(s)) ||
      (ev.product_code && ev.product_code.toLowerCase().includes(s)) ||
      ev.reader_id.toLowerCase().includes(s) ||
      ev.device_id.toLowerCase().includes(s)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">RFID Tag Management & Hardware Stream</h1>
          <p className="page-subtitle">Track 13.56 MHz RFID sticker registry, reader detections, and unassigned tag alerts</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={loadData}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`btn ${activeTab === 'tags' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setActiveTab('tags')}
            >
              <Tag size={14} />
              <span>Registered Tags ({tags.length})</span>
            </button>
            <button
              className={`btn ${activeTab === 'events' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setActiveTab('events')}
            >
              <Activity size={14} />
              <span>Live Hardware Events ({events.length})</span>
            </button>
          </div>

          <div className="input-with-icon" style={{ maxWidth: '320px', width: '100%' }}>
            <Search size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Search UID, product SKU, reader..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Content depending on Tab */}
      {activeTab === 'tags' ? (
        <div className="table-container">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>RFID Tag UID</th>
                <th>Assigned Product SKU</th>
                <th>Product Name</th>
                <th>Tag Status</th>
                <th>Assigned Timestamp</th>
                <th>Unassigned Timestamp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    Loading RFID tag directory...
                  </td>
                </tr>
              ) : filteredTags.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    <Tag size={32} color="#cbd5e1" style={{ margin: '0 auto 0.5rem' }} />
                    <div>No RFID tags found matching search criteria.</div>
                  </td>
                </tr>
              ) : (
                filteredTags.map((tag) => (
                  <tr key={tag.id}>
                    <td>
                      <span className="tag-mono" style={{ fontWeight: 700, fontSize: '0.875rem', color: '#2563eb' }}>
                        {tag.uid}
                      </span>
                    </td>
                    <td>
                      {tag.product_code ? (
                        <span
                          onClick={() => tag.product_id && navigate(`/products/${tag.product_id}`)}
                          style={{ fontWeight: 600, color: '#2563eb', cursor: 'pointer' }}
                        >
                          {tag.product_code}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: '#0f172a' }}>
                        {tag.product_name || 'No Product Bound'}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={tag.status} />
                    </td>
                    <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {tag.assigned_at ? new Date(tag.assigned_at).toLocaleString() : '--'}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {tag.unassigned_at ? new Date(tag.unassigned_at).toLocaleString() : '--'}
                    </td>
                    <td>
                      {tag.product_id && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/products/${tag.product_id}`)}
                        >
                          <span>Product</span>
                          <ExternalLink size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-container">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Detection Time</th>
                <th>Scanned UID</th>
                <th>Identified Product</th>
                <th>Reader ID</th>
                <th>IoT Controller</th>
                <th>Physical Rack</th>
                <th>Event Result</th>
                <th>Source Device</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    Loading hardware scan stream...
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    <Radio size={32} color="#cbd5e1" style={{ margin: '0 auto 0.5rem' }} />
                    <div>No hardware RFID events recorded.</div>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => (
                  <tr key={ev.id} style={{ backgroundColor: ev.event_type === 'UNKNOWN' ? '#fffafb' : undefined }}>
                    <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {new Date(ev.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td>
                      <span className="tag-mono" style={{ fontWeight: 700 }}>{ev.uid}</span>
                    </td>
                    <td>
                      {ev.product_code ? (
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{ev.product_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ev.product_code}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.8125rem' }}>
                          Unknown RFID Tag
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="tag-mono">{ev.reader_id}</span>
                    </td>
                    <td>
                      <span className="tag-mono">{ev.device_id}</span>
                    </td>
                    <td>
                      <span className="tag-mono">Rack {ev.rack_code || 'A1'}</span>
                    </td>
                    <td>
                      <span className={`badge ${ev.event_type === 'DETECTED' ? 'badge-success' : 'badge-danger'}`}>
                        {ev.event_type}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{ev.source}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
