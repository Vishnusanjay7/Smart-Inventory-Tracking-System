import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWebSocketFeed } from '../../context/WebSocketContext';
import {
  LayoutDashboard,
  Package,
  Boxes,
  History,
  Radio,
  Server,
  Layers,
  Bell,
  BarChart3,
  FileSpreadsheet,
  Users,
  Settings,
  LogOut,
  Cpu
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const { isConnected, activeAlertCount } = useWebSocketFeed();

  return (
    <aside className="sidebar">
      {/* Header / Brand */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div style={{ padding: '0.375rem', backgroundColor: '#2563eb', borderRadius: '6px', display: 'flex' }}>
            <Cpu size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ lineHeight: 1.1 }}>SMART RACK</div>
            <div style={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 500 }}>
              IoT WMS Enterprise
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-category">Warehouse Operations</div>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/inventory" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Boxes size={18} />
          <span>Inventory Stock</span>
        </NavLink>
        <NavLink to="/products" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Package size={18} />
          <span>Product Catalog</span>
        </NavLink>
        <NavLink to="/transactions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <History size={18} />
          <span>Audit Log</span>
        </NavLink>

        <div className="nav-category">IoT Hardware & Tracking</div>
        <NavLink to="/rfid" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Radio size={18} />
          <span>RFID Hub</span>
        </NavLink>
        <NavLink to="/rack" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Layers size={18} />
          <span>Rack A1 Layout</span>
        </NavLink>
        <NavLink to="/devices" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Server size={18} />
          <span>IoT Devices</span>
        </NavLink>
        <NavLink to="/alerts" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Bell size={18} />
          <span style={{ flex: 1 }}>Alerts</span>
          {activeAlertCount > 0 && (
            <span style={{ backgroundColor: '#dc2626', color: '#fff', fontSize: '0.6875rem', padding: '0.1rem 0.35rem', borderRadius: '9999px', fontWeight: 700 }}>
              {activeAlertCount}
            </span>
          )}
        </NavLink>

        <div className="nav-category">Intelligence & Management</div>
        <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <BarChart3 size={18} />
          <span>Analytics & Forecast</span>
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <FileSpreadsheet size={18} />
          <span>Reports Export</span>
        </NavLink>

        {hasRole(['ADMIN']) && (
          <NavLink to="/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Users size={18} />
            <span>User Management</span>
          </NavLink>
        )}

        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Settings size={18} />
          <span>System Settings</span>
        </NavLink>
      </nav>

      {/* Footer / User Profile & Status */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#f8fafc' }}>
              {user?.name || 'Authorized User'}
            </div>
            <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
              Role: <span style={{ color: '#60a5fa', fontWeight: 600 }}>{user?.role}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="btn btn-secondary btn-sm"
            style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#cbd5e1' }}
            title="Log Out"
          >
            <LogOut size={14} />
          </button>
        </div>

        <div className={`live-indicator ${isConnected ? 'live-connected' : 'live-disconnected'}`} style={{ width: '100%', justifyContent: 'center' }}>
          <span className="live-dot" />
          <span>{isConnected ? 'ESP8266 Live Feed' : 'IoT Gateway Offline'}</span>
        </div>
      </div>
    </aside>
  );
};
