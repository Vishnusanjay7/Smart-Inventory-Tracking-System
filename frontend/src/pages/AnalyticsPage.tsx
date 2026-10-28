import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AnalyticsSummary } from '../types';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Boxes
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await api.getAnalyticsSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch analytics summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
        Calculating analytics and usage forecasts from database history...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory Analytics & Demand Forecasting</h1>
          <p className="page-subtitle">Real-time metrics, warehouse stock trends, and dispatch-based forecasting</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={loadAnalytics}>
            <RefreshCw size={14} />
            <span>Refresh Metrics</span>
          </button>
        </div>
      </div>

      {/* Grid: Category Breakdown & 7-Day Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Left: Category Stock Distribution */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Layers size={18} color="#2563eb" />
              <span>Stock Distribution by Category</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {summary?.category_breakdown?.map((cat) => {
              const pct = summary.total_quantity > 0 ? Math.round((cat.total_quantity / summary.total_quantity) * 100) : 0;
              return (
                <div key={cat.category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{cat.category}</span>
                    <span style={{ color: '#64748b' }}>
                      {cat.total_quantity} units ({pct}%) • {cat.product_count} SKUs
                    </span>
                  </div>
                  <div style={{ height: '8px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor: '#2563eb',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: 7-Day Movement Trend */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <TrendingUp size={18} color="#16a34a" />
              <span>7-Day Inbound vs Outbound Velocity</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {summary?.daily_trends?.map((day) => (
              <div
                key={day.date}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                }}
              >
                <span className="tag-mono" style={{ fontSize: '0.75rem' }}>{day.date}</span>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>
                    +{day.received} Inbound
                  </span>
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>
                    -{day.dispatched} Outbound
                  </span>
                  <span style={{ fontWeight: 700, color: day.net_change >= 0 ? '#0f172a' : '#dc2626', minWidth: '60px', textAlign: 'right' }}>
                    Net: {day.net_change >= 0 ? `+${day.net_change}` : day.net_change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Demand Forecasting Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <BarChart3 size={18} color="#2563eb" />
              <span>Data-Driven Demand Forecasting</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              Calculated dynamically from real database dispatch transactions
            </div>
          </div>
        </div>

        <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Product SKU</th>
                <th>Product Name</th>
                <th>Current Stock</th>
                <th>Avg. Daily Usage</th>
                <th>Estimated Stock-Out</th>
                <th>Recommended Reorder</th>
                <th>Forecast Reliability & Status</th>
              </tr>
            </thead>
            <tbody>
              {summary?.demand_forecasts?.map((fc) => (
                <tr key={fc.product_id}>
                  <td>
                    <span className="tag-mono">{fc.product_id}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{fc.name}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700 }}>{fc.current_stock} units</span>
                  </td>
                  <td>
                    {fc.has_sufficient_data ? (
                      <span style={{ fontWeight: 600 }}>{fc.avg_daily_usage} / day</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>--</span>
                    )}
                  </td>
                  <td>
                    {fc.has_sufficient_data && fc.estimated_stockout_days !== null ? (
                      <span
                        style={{
                          fontWeight: 700,
                          color: fc.estimated_stockout_days <= 3 ? '#dc2626' : fc.estimated_stockout_days <= 7 ? '#d97706' : '#16a34a',
                        }}
                      >
                        ~{fc.estimated_stockout_days} days
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>--</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#2563eb' }}>
                      {fc.recommended_reorder} units
                    </span>
                  </td>
                  <td>
                    {fc.has_sufficient_data ? (
                      <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 500 }}>
                        {fc.status_message}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        {fc.status_message}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
