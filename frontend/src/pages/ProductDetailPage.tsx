import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Product, InventoryTransaction, RFIDTag } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { InventoryActionModal } from '../components/common/InventoryActionModal';
import { RfidCaptureModal } from '../components/common/RfidCaptureModal';
import { useWebSocketFeed } from '../context/WebSocketContext';
import {
  Package,
  ArrowLeft,
  Radio,
  SlidersHorizontal,
  History,
  AlertCircle,
  Tag,
  CheckCircle2,
  Calendar,
  Building,
  RefreshCw
} from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isStockModalOpen, setIsStockModalOpen] = useState<boolean>(false);
  const [isRfidCaptureOpen, setIsRfidCaptureOpen] = useState<boolean>(false);
  const [rfidActionType, setRfidActionType] = useState<'assign' | 'reassign'>('assign');
  const [assignUidInput, setAssignUidInput] = useState<string>('');

  const { liveEvents } = useWebSocketFeed();
  const navigate = useNavigate();

  const loadProductData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const prodId = parseInt(id);
      const [prod, txs] = await Promise.all([
        api.getProduct(prodId),
        api.getTransactions({ product_id: prodId }),
      ]);
      setProduct(prod);
      setTransactions(txs);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch product details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductData();
  }, [id]);

  // Re-fetch on relevant live websocket update
  useEffect(() => {
    if (liveEvents.length > 0) {
      const latest = liveEvents[0];
      if (
        (latest.type === 'INVENTORY_UPDATED' && latest.data?.product_id === product?.id) ||
        (latest.type === 'RFID_DETECTED' && latest.data?.product_id === product?.id)
      ) {
        loadProductData();
      }
    }
  }, [liveEvents]);

  const handleAssignRfid = async (uid: string) => {
    if (!product || !uid.trim()) return;
    try {
      if (rfidActionType === 'reassign') {
        await api.reassignRfid(product.id, uid.trim());
      } else {
        await api.assignRfid(product.id, uid.trim());
      }
      setAssignUidInput('');
      await loadProductData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to assign RFID tag.');
    }
  };

  const handleUnassignRfid = async () => {
    if (!product) return;
    if (!window.confirm('Are you sure you want to unassign the current RFID tag from this product?')) return;
    try {
      await api.unassignRfid(product.id);
      await loadProductData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to unassign RFID tag.');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
        Loading product master file...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
        <div style={{ padding: '2rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626' }}>
          <AlertCircle size={32} style={{ margin: '0 auto 0.5rem' }} />
          <div style={{ fontWeight: 600 }}>{error || 'Product not found.'}</div>
          <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => navigate('/products')}>
            Return to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Back Button */}
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: '1rem' }}
        onClick={() => navigate('/products')}
      >
        <ArrowLeft size={14} />
        <span>Back to Product Catalog</span>
      </button>

      {/* Header */}
      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <span className="tag-mono" style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
              {product.product_id}
            </span>
            <h1 className="page-title">{product.name}</h1>
            <StatusBadge status={product.stock_status} />
          </div>
          <p className="page-subtitle">
            {product.category?.name || 'General'} • Rack {product.rack_code} • Supplier: {product.supplier || 'N/A'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={() => setIsStockModalOpen(true)}>
            <SlidersHorizontal size={16} />
            <span>Perform Stock Action</span>
          </button>
        </div>
      </div>

      {/* Product Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Left Card: Core Data */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Package size={18} color="#2563eb" />
              <span>Specification & Master Data</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Current On-Hand Stock</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: product.current_quantity <= product.minimum_stock ? '#dc2626' : '#0f172a' }}>
                {product.current_quantity} <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#64748b' }}>{product.unit}</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Minimum Safe Stock</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>
                {product.minimum_stock} <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#64748b' }}>{product.unit}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Category</div>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>{product.category?.name || 'Uncategorized'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Primary Supplier</div>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>{product.supplier || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Storage Location</div>
              <div className="tag-mono">Rack {product.rack_code}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Last Hardware Scan</div>
              <div style={{ fontSize: '0.8125rem', color: '#0f172a' }}>
                {product.last_detected ? new Date(product.last_detected).toLocaleString() : 'Never Scanned on Rack'}
              </div>
            </div>
          </div>

          {product.description && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Description</div>
              <div style={{ fontSize: '0.875rem', color: '#334155' }}>{product.description}</div>
            </div>
          )}
        </div>

        {/* Right Card: RFID Sticker Pairing & Management */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Radio size={18} color="#2563eb" />
              <span>RFID Identification</span>
            </div>
          </div>

          {product.rfid_uid ? (
            <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, textTransform: 'uppercase' }}>
                Active Physical RFID Tag
              </div>
              <div className="tag-mono" style={{ fontSize: '1.25rem', padding: '0.35rem 0.75rem', margin: '0.5rem 0' }}>
                {product.rfid_uid}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setRfidActionType('reassign');
                    setIsRfidCaptureOpen(true);
                  }}
                >
                  Reassign Tag
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleUnassignRfid}
                >
                  Unassign Tag
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '1rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8125rem', color: '#b45309', fontWeight: 600 }}>
                No RFID Tag Associated
              </div>
              <div style={{ fontSize: '0.75rem', color: '#78350f', margin: '0.25rem 0 0.75rem' }}>
                Attach an RFID sticker to this physical product and scan it on Rack A1.
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setRfidActionType('assign');
                  setIsRfidCaptureOpen(true);
                }}
              >
                <Radio size={14} />
                <span>Pair RFID Tag</span>
              </button>
            </div>
          )}

          {/* RFID Tag History Table */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Tag Association History
            </div>
            {product.rfid_tags && product.rfid_tags.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {product.rfid_tags.map((tag) => (
                  <div
                    key={tag.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      padding: '0.375rem 0.5rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '4px',
                    }}
                  >
                    <span className="tag-mono">{tag.uid}</span>
                    <StatusBadge status={tag.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No prior tag history recorded.</div>
            )}
          </div>
        </div>
      </div>

      {/* Movement History / Audit Log */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <History size={18} color="#2563eb" />
            <span>Product Inventory Movement Audit Log</span>
          </div>
        </div>

        <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Transaction Type</th>
                <th>Quantity Delta</th>
                <th>Balance (Before → After)</th>
                <th>Rack</th>
                <th>Authorized User</th>
                <th>Reason / Reference</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    No transactions recorded yet for this product.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isPositive = tx.quantity_change > 0;
                  return (
                    <tr key={tx.id}>
                      <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${isPositive ? 'badge-success' : 'badge-danger'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: isPositive ? '#16a34a' : '#dc2626' }}>
                        {isPositive ? `+${tx.quantity_change}` : tx.quantity_change}
                      </td>
                      <td>
                        {tx.previous_quantity} → <strong>{tx.new_quantity}</strong>
                      </td>
                      <td>
                        <span className="tag-mono">Rack {tx.rack_code}</span>
                      </td>
                      <td>{tx.user_name || 'System'}</td>
                      <td>{tx.reason || 'N/A'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <InventoryActionModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        onSuccess={loadProductData}
        productId={product.id}
        productCode={product.product_id}
        productName={product.name}
        currentStock={product.current_quantity}
        rackCode={product.rack_code}
      />

      <RfidCaptureModal
        isOpen={isRfidCaptureOpen}
        onClose={() => setIsRfidCaptureOpen(false)}
        onSelectUid={(uid) => handleAssignRfid(uid)}
      />
    </div>
  );
};
