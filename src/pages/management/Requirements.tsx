import { useEffect, useState, useCallback } from 'react';
import { ManagementLayout } from '@/layouts/ManagementLayout';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge } from '@/components/StatusBadge';
import { ProgressBar } from '@/components/ProgressBar';
import { Modal } from '@/components/Modal';
import { showToast } from '@/components/Toast';
import { useAuth } from '@/hooks/useAuth';
import { getRequirements, createRequirement, deleteRequirement } from '@/services/requirements';
import { formatDate, formatKg, formatPercentage, getCategoryColor } from '@/utils/format';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { MaterialRequirement, WasteCategory } from '@/types';

export function RequirementsPage() {
  const { facility, user } = useAuth();
  const [reqs, setReqs] = useState<MaterialRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category: 'Plastic' as WasteCategory, required_quantity: '', target_date: '', notes: '' });

  const loadData = useCallback(async () => {
    if (!facility) return;
    try { setReqs(await getRequirements(facility.id)); }
    catch { /* */ } finally { setLoading(false); }
  }, [facility]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!facility || !user) return;
    const qty = parseFloat(form.required_quantity);
    if (!qty || qty <= 0) { showToast('Enter a valid quantity', 'error'); return; }
    try {
      await createRequirement({
        facility_id: facility.id, category: form.category, required_quantity: qty, unit: 'kg',
        target_date: form.target_date || undefined, notes: form.notes || undefined, created_by: user.id,
      });
      showToast('Requirement created successfully', 'success');
      setShowModal(false);
      setForm({ category: 'Plastic', required_quantity: '', target_date: '', notes: '' });
      loadData();
    } catch { showToast('Failed to create requirement', 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this requirement?')) return;
    try { await deleteRequirement(id); showToast('Requirement deleted', 'success'); loadData(); }
    catch { showToast('Failed to delete', 'error'); }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const categories: WasteCategory[] = ['Plastic', 'Organic', 'Metal', 'Fabric', 'E-Waste'];

  return (
    <ManagementLayout>
      <PageHeader title="Material Requirements" subtitle="Create and track material collection targets"
        actions={<button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition"><PlusCircle className="w-4 h-4" /> New Requirement</button>} />

      {reqs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 mb-4">No material requirements yet</p>
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 text-teal-600 font-medium"><PlusCircle className="w-5 h-5" /> Create your first requirement</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reqs.map((req) => {
            const cc = getCategoryColor(req.category);
            return (
              <div key={req.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-lg text-sm font-medium ${cc.bg} ${cc.text}`}>{req.category}</span>
                    <StatusBadge status={req.status} />
                  </div>
                  <button onClick={() => handleDelete(req.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div><span className="text-gray-500 block text-xs">Required</span><span className="font-medium text-gray-900">{formatKg(req.required_quantity)}</span></div>
                  <div><span className="text-gray-500 block text-xs">Available</span><span className="font-medium text-gray-900">{formatKg(req.available_quantity)}</span></div>
                  <div><span className="text-gray-500 block text-xs">Remaining</span><span className="font-medium text-gray-900">{formatKg(req.remaining_quantity)}</span></div>
                  <div><span className="text-gray-500 block text-xs">Progress</span><span className="font-medium text-gray-900">{formatPercentage(req.progress_percentage)}</span></div>
                </div>
                <ProgressBar value={req.available_quantity} max={req.required_quantity} color="bg-teal-500" height="h-2.5" />
                {req.target_date && <p className="text-xs text-gray-400 mt-2">Target: {formatDate(req.target_date)}</p>}
                {req.notes && <p className="text-xs text-gray-400 mt-1">{req.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Material Requirement" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Waste Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as WasteCategory })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Required Quantity (kg)</label>
            <input type="number" value={form.required_quantity} onChange={(e) => setForm({ ...form, required_quantity: e.target.value })} min="0.1" step="0.1" required
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="e.g. 500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Date (Optional)</label>
            <input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (Optional)</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none resize-none" />
          </div>
          <button onClick={handleCreate} className="w-full py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition">Create Requirement</button>
        </div>
      </Modal>
    </ManagementLayout>
  );
}
