import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { User, UserRole } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Edit2,
  X,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<UserRole>('STAFF');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const { user: currentUser } = useAuth();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load user list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.createUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        active: true,
      });
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create user account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (id === currentUser?.id) {
      alert('You cannot delete your own active administrator account.');
      return;
    }
    if (!window.confirm('Are you sure you want to remove this user from the system?')) return;
    try {
      await api.deleteUser(id);
      await loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete user.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">User Accounts & Role Permissions</h1>
          <p className="page-subtitle">Manage role-based access control (RBAC) for warehouse staff, managers, and administrators</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={loadUsers}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <UserPlus size={16} />
            <span>Create User Account</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email Address</th>
              <th>System Role</th>
              <th>Account State</th>
              <th>Registration Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  Loading authorized users...
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{u.name}</div>
                  </td>
                  <td>
                    <span className="tag-mono" style={{ fontSize: '0.8125rem' }}>{u.email}</span>
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: u.role === 'ADMIN' ? '#eff6ff' : u.role === 'MANAGER' ? '#f0fdf4' : '#f8fafc',
                        color: u.role === 'ADMIN' ? '#1d4ed8' : u.role === 'MANAGER' ? '#15803d' : '#475569',
                        borderColor: u.role === 'ADMIN' ? '#bfdbfe' : u.role === 'MANAGER' ? '#bbf7d0' : '#e2e8f0',
                      }}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={u.active ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                  <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    {u.id !== currentUser?.id && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteUser(u.id)}
                        title="Delete User"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div className="card-title">
                <Shield size={18} color="#2563eb" />
                <span>Create Authorized User</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                {error && (
                  <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '0.8125rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address (Login Username)</label>
                  <input
                    type="email"
                    className="form-input"
                    required
                    placeholder="user@smartrack.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-input"
                    required
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role Assignment</label>
                  <select
                    className="form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                  >
                    <option value="STAFF">STAFF (RFID Scanning, Inventory Actions, Catalog View)</option>
                    <option value="MANAGER">MANAGER (Inventory, Analytics, Alerts, Transactions, Reports)</option>
                    <option value="ADMIN">ADMIN (Full System Administration & User Management)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
