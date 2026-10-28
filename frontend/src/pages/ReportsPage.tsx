import React from 'react';
import {
  FileSpreadsheet,
  Download,
  Boxes,
  History,
  Radio,
  AlertTriangle,
  Server
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const reports = [
    {
      title: 'Current Inventory Valuation & Stock Report',
      description: 'Complete snapshot of all catalog products, assigned RFID UIDs, safety thresholds, and on-hand stock counts.',
      icon: <Boxes size={22} color="#2563eb" />,
      endpoint: '/api/v1/reports/inventory/csv',
      filename: 'inventory_report.csv',
    },
    {
      title: 'Comprehensive Inventory Audit Log Report',
      description: 'Historical export of all stock operations (Receive, Dispatch, Damage, Adjustments) with timestamps and user accountability.',
      icon: <History size={22} color="#16a34a" />,
      endpoint: '/api/v1/reports/transactions/csv',
      filename: 'transactions_audit_report.csv',
    },
    {
      title: 'RFID Hardware Detection & Scan Log',
      description: 'Detailed log of physical antenna read events, reader IDs, controller IP, and unknown tag scans.',
      icon: <Radio size={22} color="#0284c7" />,
      endpoint: '/api/v1/reports/rfid-activity/csv',
      filename: 'rfid_activity_report.csv',
    },
    {
      title: 'Low & Critical Stock Shortage Report',
      description: 'Filtered list of all SKUs below safety stock thresholds with calculated deficits for procurement.',
      icon: <AlertTriangle size={22} color="#dc2626" />,
      endpoint: '/api/v1/reports/low-stock/csv',
      filename: 'low_stock_report.csv',
    },
    {
      title: 'IoT Controller & Hardware Health Report',
      description: 'Diagnostic export of ESP8266 gateways, RC522 readers, uptime records, and heartbeat health status.',
      icon: <Server size={22} color="#475569" />,
      endpoint: '/api/v1/reports/device-status/csv',
      filename: 'device_status_report.csv',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Enterprise Warehouse Reports</h1>
          <p className="page-subtitle">Export official CSV data sheets for auditing, accounting, and replenishment</p>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {reports.map((rep) => (
          <div key={rep.filename} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.625rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  {rep.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>{rep.title}</h3>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>Format: CSV (Comma-Separated)</div>
                </div>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                {rep.description}
              </p>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <a
                href={rep.endpoint}
                download={rep.filename}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Download size={14} />
                <span>Download Report CSV</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
