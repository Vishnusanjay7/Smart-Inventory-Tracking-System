import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { InventoryTransaction, Product, TransactionType } from '../types';
import { useWebSocketFeed } from '../context/WebSocketContext';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const { liveEvents } = useWebSocketFeed();
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [txData, prodData] = await Promise.all([
        api.getTransactions({
          product_id: selectedProductId ? parseInt(selectedProductId) : undefined,
          type: selectedType || undefined,
        }),
        api.getProducts(),
      ]);
      setTransactions(txData);
      setProducts(prodData);
    } catch (err) {
      console.error('Failed to load transaction audit log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProductId, selectedType]);

  // Live reload on inventory transaction event
  useEffect(() => {
    if (liveEvents.length > 0 && liveEvents[0].type === 'INVENTORY_UPDATED') {
      loadData();
    }
  }, [liveEvents]);

  const filteredTransactions = transactions.filter((tx) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      tx.product_name.toLowerCase().includes(s) ||
      tx.product_code.toLowerCase().includes(s) ||
      (tx.rfid_uid && tx.rfid_uid.toLowerCase().includes(s)) ||
      (tx.reason && tx.reason.toLowerCase().includes(s)) ||
      (tx.user_name && tx.user_name.toLowerCase().includes(s))
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory Audit Trail</h1>
          <p className="page-subtitle">Immutable transaction history of every physical stock intake, dispatch, and adjustment</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={loadData}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <a
            href="/api/v1/reports/transactions/csv"
            download="transactions_audit_report.csv"
            className="btn btn-secondary"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
          <div className="input-with-icon">
            <Search size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Search product, RFID, user, reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.product_id} - {p.name}
              </option>
            ))}
          </select>

          <select
            className="form-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">All Transaction Types</option>
            <option value="RECEIVE">RECEIVE (Supplier Intake)</option>
            <option value="ADD">ADD (Stock Addition)</option>
            <option value="RETURN">RETURN (Item Return)</option>
            <option value="DISPATCH">DISPATCH (Outbound Job)</option>
            <option value="REMOVE">REMOVE (Internal Use)</option>
            <option value="DAMAGE">DAMAGE (Defect Write-off)</option>
            <option value="ADJUSTMENT">ADJUSTMENT (Audit Correction)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>TX ID</th>
              <th>Timestamp</th>
              <th>Product SKU</th>
              <th>Product Name</th>
              <th>RFID UID</th>
              <th>Action Type</th>
              <th>Change</th>
              <th>Stock Balance</th>
              <th>Rack</th>
              <th>User</th>
              <th>Reason / Reference</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  Loading audit trail...
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <History size={32} color="#cbd5e1" style={{ margin: '0 auto 0.5rem' }} />
                  <div>No inventory transactions matching the selected filters.</div>
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => {
                const isPos = tx.quantity_change > 0;
                return (
                  <tr key={tx.id}>
                    <td>
                      <span className="tag-mono" style={{ fontSize: '0.75rem' }}>#{tx.id}</span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {new Date(tx.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td>
                      <span
                        onClick={() => navigate(`/products/${tx.product_id}`)}
                        style={{ fontWeight: 600, color: '#2563eb', cursor: 'pointer' }}
                      >
                        {tx.product_code}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: '#0f172a' }}>{tx.product_name}</div>
                    </td>
                    <td>
                      {tx.rfid_uid ? (
                        <span className="tag-mono">{tx.rfid_uid}</span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>--</span>
                      )}
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
                      <span style={{ fontSize: '0.8125rem' }}>
                        {tx.previous_quantity} → <strong>{tx.new_quantity}</strong>
                      </span>
                    </td>
                    <td>
                      <span className="tag-mono">Rack {tx.rack_code}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{tx.user_name || 'System'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: '#475569' }}>{tx.reason || 'N/A'}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
