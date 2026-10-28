import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'stock' | 'device' | 'reader' | 'tag' | 'alert' | 'general';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'general' }) => {
  let badgeClass = 'badge-neutral';
  let label = status;

  switch (status.toUpperCase()) {
    case 'OK':
    case 'HEALTHY':
    case 'ONLINE':
    case 'CONNECTED':
    case 'ACTIVE':
    case 'RESOLVED':
      badgeClass = 'badge-success';
      label = status === 'OK' ? 'In Stock' : status;
      break;

    case 'LOW':
    case 'LOW_STOCK':
    case 'WARNING':
    case 'MAINTENANCE':
      badgeClass = 'badge-warning';
      label = status === 'LOW' ? 'Low Stock' : status;
      break;

    case 'CRITICAL':
    case 'CRITICAL_STOCK':
    case 'OFFLINE':
    case 'DISCONNECTED':
    case 'UNRESOLVED':
    case 'OUT_OF_STOCK':
      badgeClass = 'badge-danger';
      label = status === 'CRITICAL' ? 'Critical' : status === 'OUT_OF_STOCK' ? 'Out of Stock' : status;
      break;

    case 'INFO':
    case 'UNASSIGNED':
    case 'INACTIVE':
      badgeClass = 'badge-info';
      break;

    default:
      badgeClass = 'badge-neutral';
      break;
  }

  return <span className={`badge ${badgeClass}`}>{label}</span>;
};
