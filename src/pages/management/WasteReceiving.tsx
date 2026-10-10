import { useEffect, useState, useCallback } from 'react';
import { ManagementLayout } from '@/layouts/ManagementLayout';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Modal } from '@/components/Modal';
import { showToast } from '@/components/Toast';
import { useAuth } from '@/hooks/useAuth';
import { getReceivingRecords, createReceivingRecord } from '@/services/wasteReceiving';
import { formatDate, formatKg } from '@/utils/format';
import { PlusCircle } from 'lucide-react';
import type { WasteReceiving, WasteType } from '@/types';

export function WasteReceivingPage() {
  const { facility, user } = useAuth();
  const [records, setRecords] = useState<WasteReceiving[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ source: 'Household Collection', waste_type: 'Dry Waste' as WasteType, quantity_kg: '', notes: '' });

  const loadData = useCallback(async () => {
    if (!facility) return;
    try {
      const data = await getReceivingRecords(facility.id);
      setRecords(data);
    } catch { /* */ } finally { setLoading(false); }
  }, [facility]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!facility || !user) return;
    const qty = parseFloat(form.quantity_kg);
    if (!qty || qty <= 0) { showToast('Enter a valid quantity', 'error'); return; }
    try {
      await createReceivingRecord({
        facility_id: facility.id,
        source: form.source,
        waste_type: form.waste_type,
        quantity_kg: qty,
        notes: form.notes || undefined,
        received_by: user.id,
      });
      showToast('Waste received recorded successfully', 'success');
      setShowModal(false);
      setForm({ source: 'Household Collection', waste_type: 'Dry Waste', quantity_kg: '', notes: '' });
      loadData();
    } catch {
      showToast('Failed to record waste receiving', 'error');
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ManagementLayout>
      <PageHeader title="Waste Receiving" subtitle="Record waste received at the facility"
        actions={<button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition"><PlusCircle className="w-4 h-4" /> Record Receiving</button>} />

      <DataTable
        columns={[
          { key: 'receiving_code', header: 'Receiving ID', render: (r) => <span className="font-mono text-xs">{r.receiving_code}</span> },
          { key: 'created_at', header: 'Date', render: (r) => formatDate(r.created_at) },
          { key: 'source', header: 'Source' },
          { key: 'waste_type', header: 'Waste Type' },
          { key: 'quantity_kg', header: 'Quantity', render: (r) => formatKg(r.quantity_kg) },
          { key: 'unit', header: 'Unit' },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'notes', header: 'Notes', render: (r) => r.notes || '—' },
        ]}
        data={records}
        emptyMessage="No waste receiving records yet"
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Waste Receiving" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Source</label>
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none">
              <option>Household Collection</option>
              <option>Other Configured Source</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Waste Type</label>
            <select value={form.waste_type} onChange={(e) => setForm({ ...form, waste_type: e.target.value as WasteType })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none">
              <option>Wet Waste</option>
              <option>Dry Waste</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity (kg)</label>
            <input type="number" value={form.quantity_kg} onChange={(e) => setForm({ ...form, quantity_kg: e.target.value })} min="0.1" step="0.1" required
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="e.g. 50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (Optional)</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none resize-none" placeholder="Additional notes..." />
          </div>
          <button onClick={handleCreate} className="w-full py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition">Record Receiving</button>
        </div>
      </Modal>
    </ManagementLayout>
  );
}
