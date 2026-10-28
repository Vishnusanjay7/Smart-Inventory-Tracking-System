import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Product, Category } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  ExternalLink,
  Radio
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodData, catData] = await Promise.all([
        api.getProducts({
          search: search || undefined,
          category_id: selectedCategory ? parseInt(selectedCategory) : undefined,
        }),
        api.getCategories(),
      ]);
      setProducts(prodData);
      setCategories(catData);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedCategory]);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Product Master Catalog</h1>
          <p className="page-subtitle">Manage product definitions, suppliers, safety thresholds, and RFID tag associations</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={loadData}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/products/new')}>
            <Plus size={16} />
            <span>Register Product</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
          <div className="input-with-icon">
            <Search size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Search product code, name, supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

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
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Product SKU</th>
              <th>Name & Description</th>
              <th>Category</th>
              <th>Supplier</th>
              <th>Assigned RFID</th>
              <th>Stock Level</th>
              <th>Rack Placement</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  Loading catalog items...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <Package size={32} color="#cbd5e1" style={{ margin: '0 auto 0.5rem' }} />
                  <div>No products found. Click "Register Product" to create one.</div>
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span
                      onClick={() => navigate(`/products/${p.id}`)}
                      style={{ fontWeight: 600, color: '#2563eb', cursor: 'pointer' }}
                    >
                      {p.product_id}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.description || 'No description provided'}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8125rem', color: '#475569' }}>
                      {p.category?.name || 'Uncategorized'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8125rem', color: '#475569' }}>
                      {p.supplier || 'N/A'}
                    </span>
                  </td>
                  <td>
                    {p.rfid_uid ? (
                      <span
                        onClick={() => navigate(`/rfid/${p.rfid_uid}`)}
                        className="tag-mono"
                        style={{ cursor: 'pointer', color: '#2563eb' }}
                      >
                        {p.rfid_uid}
                      </span>
                    ) : (
                      <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700 }}>{p.current_quantity}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>/ Min: {p.minimum_stock}</span>
                      <StatusBadge status={p.stock_status} />
                    </div>
                  </td>
                  <td>
                    <span className="tag-mono">Rack {p.rack_code}</span>
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/products/${p.id}`)}
                    >
                      <span>Manage</span>
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
  );
};
