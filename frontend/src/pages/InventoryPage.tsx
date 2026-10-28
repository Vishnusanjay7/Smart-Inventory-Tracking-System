import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { InventoryItem, Category, Rack } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { InventoryActionModal } from '../components/common/InventoryActionModal';
import { useWebSocketFeed } from '../context/WebSocketContext';
import {
  Boxes,
  Search,
  Filter,
  Plus,
  Minus,
  RefreshCw,
  SlidersHorizontal,
  PackageCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>('');
  const [selectedRack, setSelectedRack] = useState<string>('');

  // Modal State
  const [activeItemForAction, setActiveItemForAction] = useState<InventoryItem | null>(null);

  const { liveEvents } = useWebSocketFeed();
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [invData, catData, rackData] = await Promise.all([
        api.getInventory({
          search: search || undefined,
          category_id: selectedCategory ? parseInt(selectedCategory) : undefined,
          rack_id: selectedRack ? parseInt(selectedRack) : undefined,
          stock_status: selectedStockStatus || undefined,
        }),
        api.getCategories(),
        api.getRacks(),
      ]);
      setItems(invData);
      setCategories(catData);
      setRacks(rackData);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedCategory, selectedStockStatus, selectedRack]);

  // Refresh automatically if real-time inventory update arrives
  useEffect(() => {
    if (liveEvents.length > 0 && liveEvents[0].type === 'INVENTORY_UPDATED') {
      loadData();
    }
  }, [liveEvents]);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Warehouse Inventory Stock</h1>
          <p className="page-subtitle">Track physical quantities, safety thresholds, and execute stock operations</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={loadData}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/products/new')}>
            <Plus size={16} />
            <span>Register New Product</span>
          </button>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
          {/* Search */}
          <div className="input-with-icon">
            <Search size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Search product SKU or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <select
            className="form-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Status Filter */}
          <select
            className="form-select"
            value={selectedStockStatus}
            onChange={(e) => setSelectedStockStatus(e.target.value)}
          >
            <option value="">All Stock Levels</option>
            <option value="OK">Healthy Stock</option>
            <option value="LOW">Low Stock</option>
            <option value="CRITICAL">Critical Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>

          {/* Rack Filter */}
          <select
            className="form-select"
            value={selectedRack}
            onChange={(e) => setSelectedRack(e.target.value)}
          >
            <option value="">All Racks</option>
            {racks.map((r) => (
              <option key={r.id} value={r.id}>
                Rack {r.rack_code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Product SKU</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Assigned RFID UID</th>
              <th>Physical Rack</th>
              <th>On-Hand Stock</th>
              <th>Min Stock</th>
              <th>Health Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  Loading warehouse stock records...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <Boxes size={32} color="#cbd5e1" style={{ margin: '0 auto 0.5rem' }} />
                  <div>No inventory records found matching your filters.</div>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span
                      onClick={() => navigate(`/products/${item.product_id}`)}
                      style={{ fontWeight: 600, color: '#2563eb', cursor: 'pointer' }}
                    >
                      {item.product_code}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.product_name}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8125rem', color: '#475569' }}>
                      {item.category_name || 'Uncategorized'}
                    </span>
                  </td>
                  <td>
                    {item.rfid_uid ? (
                      <span
                        onClick={() => navigate(`/rfid/${item.rfid_uid}`)}
                        className="tag-mono"
                        style={{ cursor: 'pointer', color: '#2563eb' }}
                      >
                        {item.rfid_uid}
                      </span>
                    ) : (
                      <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                        No Tag
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="tag-mono">Rack {item.rack_code}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: item.quantity <= item.minimum_stock ? '#dc2626' : '#0f172a' }}>
                      {item.quantity}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                      {item.minimum_stock}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={item.stock_status} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.5rem' }}
                        title="Stock Operations"
                        onClick={() => setActiveItemForAction(item)}
                      >
                        <SlidersHorizontal size={13} />
                        <span>Transact</span>
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/products/${item.product_id}`)}
                        title="View Details"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Stock Transaction Action Modal */}
      {activeItemForAction && (
        <InventoryActionModal
          isOpen={!!activeItemForAction}
          onClose={() => setActiveItemForAction(null)}
          onSuccess={loadData}
          productId={activeItemForAction.product_id}
          productCode={activeItemForAction.product_code}
          productName={activeItemForAction.product_name}
          currentStock={activeItemForAction.quantity}
          rackCode={activeItemForAction.rack_code}
        />
      )}
    </div>
  );
};
