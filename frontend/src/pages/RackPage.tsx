import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { StatusBadge } from '../components/common/StatusBadge';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Server,
  Radio,
  Boxes,
  Info,
  ExternalLink,
  RefreshCw,
  Plus
} from 'lucide-react';

export const RackPage: React.FC = () => {
  const [rackDetails, setRackDetails] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const loadRack = async () => {
    setLoading(true);
    try {
      const data = await api.getRackDetails('A1');
      setRackDetails(data);
    } catch (err) {
      console.error('Failed to load Rack A1 details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRack();
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Physical Rack Topology & Inventory</h1>
          <p className="page-subtitle">Physical warehouse structure, reader placement, and active shelf contents</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={loadRack}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Rack Architecture Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div className="card-title">
            <Layers size={18} color="#2563eb" />
            <span>Physical Deployment Hierarchy</span>
          </div>
          <StatusBadge status={rackDetails?.status || 'ACTIVE'} />
        </div>

        {/* Tree Visualizer */}
        <div
          style={{
            padding: '1.5rem',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
            {/* Level 1: Rack */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
              <Layers size={20} color="#2563eb" />
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>Primary Smart Storage: Rack A1</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Heavy-duty warehouse rack bay</div>
              </div>
            </div>

            {/* Tree Branch 1 */}
            <div style={{ marginLeft: '1.5rem', paddingLeft: '1rem', borderLeft: '2px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Level 2: Reader */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                <Radio size={18} color="#0284c7" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
                    Reader: {rackDetails?.readers?.[0]?.reader_id || 'RC522-01'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    13.56 MHz High-Frequency SPI RFID Antenna
                  </div>
                </div>
                <StatusBadge status={rackDetails?.readers?.[0]?.status || 'CONNECTED'} />
              </div>

              {/* Tree Branch 2 */}
              <div style={{ marginLeft: '1.5rem', paddingLeft: '1rem', borderLeft: '2px solid #cbd5e1' }}>
                
                {/* Level 3: ESP8266 Controller */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                  <Server size={18} color="#16a34a" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
                      IoT Hub: {rackDetails?.readers?.[0]?.device_id || 'ESP8266-01'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      NodeMCU Wi-Fi Gateway • IP: {rackDetails?.readers?.[0]?.device_ip || '192.168.1.50'}
                    </div>
                  </div>
                  <StatusBadge status={rackDetails?.readers?.[0]?.device_status || 'ONLINE'} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Location Notice Callout per Rule 28 */}
        <div style={{ padding: '0.875rem 1rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <Info size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
          <div style={{ fontSize: '0.8125rem', color: '#1e3a8a', lineHeight: 1.5 }}>
            <strong>Operational Boundary Note:</strong> The RC522 RFID reader detects presence when a tagged product is scanned within range of the antenna mounted on <strong>Rack A1</strong>. 
            The system records the rack association accurately without claiming sub-millimeter 3D shelf position.
          </div>
        </div>
      </div>

      {/* Shelf Stock Inventory Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Boxes size={18} color="#2563eb" />
            <span>Products Stored on Rack A1 ({rackDetails?.total_items_count ?? 0} SKUs, {rackDetails?.total_stock_units ?? 0} Total Units)</span>
          </div>
        </div>

        <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Product SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Units on Shelf</th>
                <th>Safety Minimum</th>
                <th>Stock Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    Loading shelf inventory...
                  </td>
                </tr>
              ) : rackDetails?.products?.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    No products currently assigned to Rack A1.
                  </td>
                </tr>
              ) : (
                rackDetails?.products?.map((p: any) => (
                  <tr key={p.product_id}>
                    <td>
                      <span
                        onClick={() => navigate(`/products/${p.product_id}`)}
                        style={{ fontWeight: 600, color: '#2563eb', cursor: 'pointer' }}
                      >
                        {p.product_code}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: '#475569' }}>{p.category || 'General'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: p.quantity <= p.minimum_stock ? '#dc2626' : '#0f172a' }}>
                        {p.quantity}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{p.minimum_stock}</span>
                    </td>
                    <td>
                      <StatusBadge status={p.quantity <= 2 ? 'CRITICAL' : p.quantity <= p.minimum_stock ? 'LOW' : 'OK'} />
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/products/${p.product_id}`)}
                      >
                        <span>View</span>
                        <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
