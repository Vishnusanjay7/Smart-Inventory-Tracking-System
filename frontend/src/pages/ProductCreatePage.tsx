import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Category, Rack } from '../types';
import { RfidCaptureModal } from '../components/common/RfidCaptureModal';
import {
  PackagePlus,
  Radio,
  ArrowLeft,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export const ProductCreatePage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanModalOpen, setIsScanModalOpen] = useState<boolean>(false);

  // Form Fields
  const [productId, setProductId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [supplier, setSupplier] = useState<string>('');
  const [unit, setUnit] = useState<string>('pcs');
  const [minimumStock, setMinimumStock] = useState<number>(5);
  const [initialQuantity, setInitialQuantity] = useState<number>(0);
  const [rackCode, setRackCode] = useState<string>('A1');
  const [rfidUid, setRfidUid] = useState<string>('');

  const navigate = useNavigate();

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [cats, rks] = await Promise.all([api.getCategories(), api.getRacks()]);
        setCategories(cats);
        setRacks(rks);
        if (cats.length > 0) setCategoryId(cats[0].id.toString());
      } catch (err) {
        console.error('Failed to load categories/racks:', err);
      }
    };
    fetchMetadata();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.createProduct({
        product_id: productId.trim().toUpperCase(),
        name: name.trim(),
        category_id: categoryId ? parseInt(categoryId) : undefined,
        description: description.trim() || undefined,
        supplier: supplier.trim() || undefined,
        unit,
        minimum_stock: minimumStock,
        initial_quantity: initialQuantity,
        rack_code: rackCode,
        rfid_uid: rfidUid.trim() || undefined,
      });

      navigate('/products');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create product.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: '1rem' }}
        onClick={() => navigate('/products')}
      >
        <ArrowLeft size={14} />
        <span>Back to Product Catalog</span>
      </button>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <PackagePlus size={20} color="#2563eb" />
            <span>Register New Inventory Product</span>
          </div>
          <span className="badge badge-info">Master Catalog</span>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '0.8125rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Product Master Data */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Product ID / SKU *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. LAP001, DRL003"
                value={productId}
                onChange={(e) => setProductId(e.target.value.toUpperCase())}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Enterprise Laptop 15-inch"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Supplier / Manufacturer</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Dell, Bosch, Cisco"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Specifications</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Detailed technical specifications, part number, shelf notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Section 2: RFID Sticker Registration */}
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              margin: '1.25rem 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
                  RFID Tag Association (RC522 Integration)
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Map a unique 13.56 MHz RFID sticker attached to this product
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsScanModalOpen(true)}
              >
                <Radio size={14} color="#2563eb" />
                <span>Capture from Physical Reader</span>
              </button>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">RFID UID Hex String</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. E234A891 (tap tag on Rack A1 or type manually)"
                value={rfidUid}
                onChange={(e) => setRfidUid(e.target.value.replace(/[\s-:]/g, '').toUpperCase())}
              />
            </div>
          </div>

          {/* Section 3: Stock Placement & Thresholds */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Unit of Measure</label>
              <select className="form-select" value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="pcs">pcs</option>
                <option value="units">units</option>
                <option value="pairs">pairs</option>
                <option value="boxes">boxes</option>
                <option value="meters">meters</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Initial Quantity</label>
              <input
                type="number"
                min={0}
                className="form-input"
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Minimum Stock</label>
              <input
                type="number"
                min={1}
                className="form-input"
                value={minimumStock}
                onChange={(e) => setMinimumStock(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Rack</label>
              <select className="form-select" value={rackCode} onChange={(e) => setRackCode(e.target.value)}>
                <option value="A1">Rack A1 (Primary)</option>
                {racks.filter((r) => r.rack_code !== 'A1').map((r) => (
                  <option key={r.id} value={r.rack_code}>
                    Rack {r.rack_code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/products')}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Registering...' : 'Register Product in Catalog'}
            </button>
          </div>
        </form>
      </div>

      <RfidCaptureModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onSelectUid={(uid) => setRfidUid(uid)}
      />
    </div>
  );
};
