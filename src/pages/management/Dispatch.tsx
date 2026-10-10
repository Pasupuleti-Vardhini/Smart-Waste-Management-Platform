import { useEffect, useState, useCallback } from 'react';
import { ManagementLayout } from '@/layouts/ManagementLayout';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Modal } from '@/components/Modal';
import { showToast } from '@/components/Toast';
import { useAuth } from '@/hooks/useAuth';
import { getDispatchRecords, createDispatch } from '@/services/dispatch';
import { getInventory } from '@/services/inventory';
import { getRequirements } from '@/services/requirements';
import { formatDate, formatKg, getCategoryColor } from '@/utils/format';
import { Send, PlusCircle } from 'lucide-react';
import type { DispatchRecord, StorageInventory, MaterialRequirement, WasteCategory } from '@/types';

const CATEGORIES: WasteCategory[] = ['Plastic', 'Organic', 'Metal', 'Fabric', 'E-Waste'];

export function DispatchPage() {
  const { facility, user } = useAuth();
  const [records, setRecords] = useState<DispatchRecord[]>([]);
  const [inventory, setInventory] = useState<StorageInventory[]>([]);
  const [reqs, setReqs] = useState<MaterialRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | WasteCategory>('overview');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category: 'Plastic' as WasteCategory, quantity_kg: '', destination: 'Recycling Processing Center', notes: '', requirementId: '' });
  const [dateFilter, setDateFilter] = useState('all');

  const loadData = useCallback(async () => {
    if (!facility) return;
    try {
      const [disp, inv, req] = await Promise.all([getDispatchRecords(facility.id), getInventory(facility.id), getRequirements(facility.id)]);
      setRecords(disp); setInventory(inv); setReqs(req);
    } catch { /* */ } finally { setLoading(false); }
  }, [facility]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!facility || !user) return;
    const qty = parseFloat(form.quantity_kg);
    if (!qty || qty <= 0) { showToast('Enter a valid quantity', 'error'); return; }
    const result = await createDispatch({
      facility_id: facility.id, category: form.category, quantity_kg: qty,
      destination: form.destination, notes: form.notes || undefined, dispatched_by: user.id,
      material_requirement_id: form.requirementId || undefined,
    });
    if (!result.success) { showToast(result.error || 'Dispatch failed', 'error'); return; }
    showToast(`Dispatched ${qty}kg of ${form.category} successfully`, 'success');
    setShowModal(false);
    setForm({ category: 'Plastic', quantity_kg: '', destination: 'Recycling Processing Center', notes: '', requirementId: '' });
    loadData();
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const getCatTotal = (cat: string) => records.filter((r) => r.category === cat).reduce((s, r) => s + r.quantity_kg, 0);
  const totalAll = records.reduce((s, r) => s + r.quantity_kg, 0);
  const getAvailable = (cat: string) => inventory.find((i) => i.category === cat)?.available_quantity || 0;

  const filterByDate = (recs: DispatchRecord[]) => {
    if (dateFilter === 'all') return recs;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (dateFilter === 'today') return recs.filter((r) => r.created_at.split('T')[0] === today);
    if (dateFilter === 'week') { const wk = new Date(now); wk.setDate(wk.getDate() - 7); return recs.filter((r) => new Date(r.created_at) >= wk); }
    if (dateFilter === 'month') { const mo = new Date(now); mo.setMonth(mo.getMonth() - 1); return recs.filter((r) => new Date(r.created_at) >= mo); }
    return recs;
  };

  const tabRecords = tab === 'overview' ? [] : filterByDate(records.filter((r) => r.category === tab));
  const activeReqsForCat = (cat: string) => reqs.filter((r) => r.category === cat && ['Requirement Fulfilled', 'Ready for Dispatch'].includes(r.status));

  return (
    <ManagementLayout>
      <PageHeader title="Dispatch" subtitle="Dispatch waste to recycling and processing destinations"
        actions={<button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition"><PlusCircle className="w-4 h-4" /> New Dispatch</button>} />

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setTab('overview')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${tab === 'overview' ? 'bg-teal-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Overview</button>
        {CATEGORIES.map((c) => <button key={c} onClick={() => setTab(c)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${tab === c ? 'bg-teal-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{c}</button>)}
      </div>

      {tab === 'overview' ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {CATEGORIES.map((c) => { const cc = getCategoryColor(c); return (
              <div key={c} className={`rounded-xl border p-4 ${cc.border} ${cc.bg}`}>
                <p className={`text-xs font-medium ${cc.text}`}>{c}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{formatKg(getCatTotal(c))}</p>
              </div>
            ); })}
          </div>
          <div className="bg-teal-50 rounded-xl border border-teal-200 p-6 text-center">
            <p className="text-sm text-teal-600 font-medium">TOTAL DISPATCHED</p>
            <p className="text-4xl font-bold text-teal-700 mt-2">{formatKg(totalAll)}</p>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {['all', 'today', 'week', 'month'].map((f) => <button key={f} onClick={() => setDateFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${dateFilter === f ? 'bg-teal-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{f === 'all' ? 'All Time' : f.charAt(0).toUpperCase() + f.slice(1)}</button>)}
          </div>
          <div className="bg-teal-50 rounded-lg border border-teal-200 p-4 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-teal-700">Total {tab} Dispatched:</span>
              <span className="text-xl font-bold text-teal-800">{formatKg(tabRecords.reduce((s, r) => s + r.quantity_kg, 0))}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-teal-600">Available for dispatch:</span>
              <span className="text-sm font-medium text-teal-700">{formatKg(getAvailable(tab))}</span>
            </div>
          </div>
          <DataTable
            columns={[
              { key: 'dispatch_code', header: 'Dispatch ID', render: (r) => <span className="font-mono text-xs">{r.dispatch_code}</span> },
              { key: 'created_at', header: 'Date', render: (r) => formatDate(r.created_at) },
              { key: 'quantity_kg', header: 'Quantity', render: (r) => formatKg(r.quantity_kg) },
              { key: 'destination', header: 'Destination' },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'notes', header: 'Notes', render: (r) => r.notes || '—' },
            ]}
            data={tabRecords}
            emptyMessage={`No ${tab} dispatches yet`}
          />
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Dispatch" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as WasteCategory, requirementId: '' })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c} (Available: {formatKg(getAvailable(c))})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity (kg)</label>
            <input type="number" value={form.quantity_kg} onChange={(e) => setForm({ ...form, quantity_kg: e.target.value })} min="0.1" step="0.1" required
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none" placeholder={`Max: ${formatKg(getAvailable(form.category))}`} />
            <p className="text-xs text-gray-400 mt-1">Available: {formatKg(getAvailable(form.category))}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Destination</label>
            <input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none" />
          </div>
          {activeReqsForCat(form.category).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Link to Requirement (Optional)</label>
              <select value={form.requirementId} onChange={(e) => setForm({ ...form, requirementId: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none">
              <option value="">No linked requirement</option>
              {activeReqsForCat(form.category).map((r) => <option key={r.id} value={r.id}>{r.required_quantity}kg — {r.status}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (Optional)</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none resize-none" />
          </div>
          <button onClick={handleCreate} className="w-full py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition">Create Dispatch</button>
        </div>
      </Modal>
    </ManagementLayout>
  );
}
