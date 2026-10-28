import React, { useState } from 'react';
import { TransactionType } from '../../types';
import { api } from '../../api/client';
import { X, AlertCircle } from 'lucide-react';

interface InventoryActionModalProps {
  productId: number;
  productCode: string;
  productName: string;
  currentStock: number;
  rackCode?: string;
  initialOperationType?: TransactionType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const InventoryActionModal: React.FC<InventoryActionModalProps> = ({
  productId,
  productCode,
  productName,
  currentStock,
  rackCode = 'A1',
  initialOperationType = 'RECEIVE',
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [operationType, setOperationType] = useState<TransactionType>(initialOperationType);
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
  );

  React.useEffect(() => {
    if (isOpen) {
      if (initialOperationType) setOperationType(initialOperationType);
      setIdempotencyKey(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));
      setQuantity(1);
      setReason('');
      setError(null);
    }
  }, [isOpen, initialOperationType]);

  if (!isOpen) return null;

  const isDeduction = ['DISPATCH', 'REMOVE', 'DAMAGE'].includes(operationType);
  const projectedStock = isDeduction ? currentStock - quantity : currentStock + quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('Quantity must be at least 1 unit');
      return;
    }
    if (isDeduction && projectedStock < 0) {
      setError(`Cannot deduct ${quantity} units. Current stock is only ${currentStock} units.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.performOperation(productId, {
        type: operationType,
        quantity,
        reason: reason.trim() || undefined,
        rack_code: rackCode,
        idempotency_key: idempotencyKey,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to process inventory operation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h3 className="card-title">Inventory Transaction</h3>
            <p className="page-subtitle">
              {productName} ({productCode}) • Rack {rackCode}
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '0.8125rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Operation Type</label>
              <select
                className="form-select"
                value={operationType}
                onChange={(e) => setOperationType(e.target.value as TransactionType)}
              >
                <option value="RECEIVE">RECEIVE (+ Stock Intake from Supplier)</option>
                <option value="ADD">ADD (+ Internal Stock Adjustment)</option>
                <option value="RETURN">RETURN (+ Returned from Floor/Site)</option>
                <option value="DISPATCH">DISPATCH (- Outbound Shipment to Job/Customer)</option>
                <option value="REMOVE">REMOVE (- Internal Warehouse Requisition)</option>
                <option value="DAMAGE">DAMAGE (- Defective / Damaged Write-off)</option>
                <option value="ADJUSTMENT">ADJUSTMENT (Audit Correction)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Units to {isDeduction ? 'Deduct' : 'Add'}</label>
                <input
                  type="number"
                  min={1}
                  className="form-input"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Projected New Stock</label>
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, fontSize: '0.9375rem', color: projectedStock < 0 ? '#dc2626' : '#0f172a' }}>
                  {currentStock} → {projectedStock} units
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Reason / Reference Note (Required for Audit)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., PO #9023, Work Order #440, Shelf audit"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className={`btn ${isDeduction ? 'btn-danger' : 'btn-primary'}`}
              disabled={loading || (isDeduction && projectedStock < 0)}
            >
              {loading ? 'Processing...' : `Confirm ${operationType}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
