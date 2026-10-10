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
import { supabase } from '@/lib/supabase';
import { getFacilityRequests, assignCollector, updateRequestStatus, recordCollection, assignFacilityToRequest } from '@/services/collection';
import { createAlert } from '@/services/alerts';
import { formatDate, formatKg, formatCurrency } from '@/utils/format';
import { Package, Clock, CheckCircle, Droplets, Trash2, Gift, UserCog, ClipboardList } from 'lucide-react';
import type { CollectionRequest, RewardRate, ManagementUserWithProfile } from '@/types';

interface RequestWithProfile extends CollectionRequest {
  profiles?: { full_name: string; email: string; phone: string | null };
}

interface WasteReceivingRecord {
  id: string;
  waste_type: string;
  quantity_kg: number;
  status: string;
}

export function CollectionManagementPage() {
  const { facility, managementUser, user } = useAuth();
  const [requests, setRequests] = useState<RequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [rewardRates, setRewardRates] = useState<RewardRate[]>([]);
  const [collectors, setCollectors] = useState<ManagementUserWithProfile[]>([]);
  const [wasteReceived, setWasteReceived] = useState<WasteReceivingRecord[]>([]);
  const [selectedReq, setSelectedReq] = useState<RequestWithProfile | null>(null);
  const [assignModal, setAssignModal] = useState<RequestWithProfile | null>(null);
  const [recordModal, setRecordModal] = useState<RequestWithProfile | null>(null);
  const [actualQty, setActualQty] = useState('');
  const [selectedCollector, setSelectedCollector] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!facility) return;
    try {
      const [reqs, rates, colRes, recvRes] = await Promise.all([
        getFacilityRequests(facility.id),
        supabase.from('reward_rates').select('*').eq('facility_id', facility.id),
        supabase.from('management_users')
          .select('*, profiles!management_users_profiles_user_id_fkey(full_name, email, phone)')
          .eq('facility_id', facility.id)
          .eq('is_active', true),
        supabase.from('waste_receiving').select('id, waste_type, quantity_kg, status').eq('facility_id', facility.id),
      ]);
      setRequests(reqs as RequestWithProfile[]);
      setRewardRates((rates.data || []) as unknown as RewardRate[]);
      setCollectors((colRes.data || []) as unknown as ManagementUserWithProfile[]);
      setWasteReceived((recvRes.data || []) as WasteReceivingRecord[]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [facility]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAssign = async () => {
    if (!assignModal || !selectedCollector) return;
    const collector = collectors.find((c) => c.id === selectedCollector);
    if (!collector) return;
    try {
      await assignCollector(assignModal.id, collector.id, collector.profiles?.full_name || 'Collector');
      showToast('Collector assigned successfully', 'success');
      setAssignModal(null);
      setSelectedCollector('');
      loadData();
    } catch {
      showToast('Failed to assign collector', 'error');
    }
  };

  const handleStatusUpdate = async (req: RequestWithProfile, status: string) => {
    try {
      await updateRequestStatus(req.id, status);
      showToast(`Status updated to ${status}`, 'success');
      loadData();
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleRecordCollection = async () => {
    if (!recordModal || !facility || !user || !managementUser || saving) return;
    const qty = parseFloat(actualQty);
    if (!qty || qty <= 0) {
      showToast('Please enter a valid quantity', 'error');
      return;
    }
    const rate = rewardRates.find((r) => r.waste_type === recordModal.waste_type);
    if (!rate) {
      showToast('No reward rate configured for this waste type', 'error');
      return;
    }
    const reward = qty * rate.rate_per_kg;
    setSaving(true);
    try {
      await recordCollection(
        recordModal.id,
        facility.id,
        recordModal.user_id,
        recordModal.waste_type,
        recordModal.estimated_quantity_kg,
        qty,
        rate.rate_per_kg,
        reward,
        managementUser.id,
        managementUser.job_title || 'Collector',
        user.id,
        rate.id,
      );
      await createAlert({
        facility_id: facility.id,
        type: 'Collection Request Pending',
        severity: 'Info',
        title: 'Collection Completed',
        message: `${qty}kg ${recordModal.waste_type} collected. Reward: ₹${reward.toFixed(2)}`,
        related_id: recordModal.id,
        related_table: 'collection_requests',
      });
      showToast(`Collection recorded. Reward: ₹${reward.toFixed(2)}`, 'success');
      setRecordModal(null);
      setActualQty('');
      loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to record collection', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignFacility = async (req: RequestWithProfile) => {
    if (!facility) return;
    try {
      await assignFacilityToRequest(req.id, facility.id);
      showToast('Request assigned to your facility', 'success');
      loadData();
    } catch {
      showToast('Failed to assign facility', 'error');
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const newReqs = requests.filter((r) => r.status === 'Requested');
  const todayStr = new Date().toISOString().split('T')[0];
  const todayColl = requests.filter((r) => r.created_at?.split('T')[0] === todayStr);
  const pendingColl = requests.filter((r) => ['Assigned', 'Pickup Scheduled', 'Collection In Progress'].includes(r.status));
  const completedColl = requests.filter((r) => r.status === 'Completed');

  // Waste quantities: combine collection_requests actuals and waste_receiving records
  const reqWet = requests.filter((r) => r.waste_type === 'Wet Waste').reduce((s, r) => s + (r.actual_quantity_kg || 0), 0);
  const reqDry = requests.filter((r) => r.waste_type === 'Dry Waste').reduce((s, r) => s + (r.actual_quantity_kg || 0), 0);
  const recvWet = wasteReceived.filter((w) => w.waste_type === 'Wet Waste').reduce((s, w) => s + (w.quantity_kg || 0), 0);
  const recvDry = wasteReceived.filter((w) => w.waste_type === 'Dry Waste').reduce((s, w) => s + (w.quantity_kg || 0), 0);
  const totalWet = reqWet + recvWet;
  const totalDry = reqDry + recvDry;

  // Rewards: calculate from waste quantities using configured reward rates
  const rewardForType = (wasteType: string, qty: number) => {
    const rate = rewardRates.find((r) => r.waste_type === wasteType);
    return rate ? qty * rate.rate_per_kg : 0;
  };
  const reqRewards = requests.reduce((s, r) => s + (r.reward_amount || 0), 0);
  const recvRewards = wasteReceived.reduce((s, w) => s + rewardForType(w.waste_type, w.quantity_kg || 0), 0);
  const totalRewards = reqRewards + recvRewards;

  const filtered = statusFilter === 'all' ? requests : requests.filter((r) => r.status === statusFilter);
  const filters = ['all', 'Requested', 'Assigned', 'Pickup Scheduled', 'Collection In Progress', 'Collected', 'Completed', 'Cancelled'];

  return (
    <ManagementLayout>
      <PageHeader title="Collection Management" subtitle="Manage household waste collection requests" />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
        <KpiCard label="New" value={newReqs.length} icon={Package} color="text-blue-600" />
        <KpiCard label="Today" value={todayColl.length} icon={Clock} color="text-teal-600" />
        <KpiCard label="Pending" value={pendingColl.length} icon={Clock} color="text-amber-600" />
        <KpiCard label="Completed" value={completedColl.length} icon={CheckCircle} color="text-green-600" />
        <KpiCard label="Wet Waste" value={formatKg(totalWet)} icon={Droplets} color="text-cyan-600" />
        <KpiCard label="Dry Waste" value={formatKg(totalDry)} icon={Trash2} color="text-gray-600" />
        <KpiCard label="Rewards" value={formatCurrency(totalRewards)} icon={Gift} color="text-amber-600" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map((f) => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${statusFilter === f ? 'bg-teal-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      <DataTable
        columns={[
          { key: 'request_code', header: 'Request ID', render: (r) => <span className="font-mono text-xs">{r.request_code}</span> },
          { key: 'household', header: 'Household', render: (r) => r.profiles?.full_name || 'N/A' },
          { key: 'waste_type', header: 'Type' },
          { key: 'estimated_quantity_kg', header: 'Est. Qty', render: (r) => formatKg(r.estimated_quantity_kg) },
          { key: 'preferred_pickup_date', header: 'Pickup Date', render: (r) => formatDate(r.preferred_pickup_date) },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'assigned_collector', header: 'Collector', render: (r) => r.assigned_collector || '—' },
          { key: 'actual_quantity_kg', header: 'Actual Qty', render: (r) => r.actual_quantity_kg != null ? formatKg(r.actual_quantity_kg) : '—' },
          { key: 'reward_amount', header: 'Reward', render: (r) => r.reward_amount != null ? formatCurrency(r.reward_amount) : '—' },
          { key: 'actions', header: 'Actions', render: (r) => (
            <div className="flex items-center gap-1">
              <button onClick={() => setSelectedReq(r)} className="p-1.5 rounded hover:bg-teal-50 text-teal-600" title="View">
                <ClipboardList className="w-4 h-4" />
              </button>
              {r.status === 'Requested' && !r.facility_id && (
                <button onClick={() => handleAssignFacility(r)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600 text-xs font-medium">Assign to Facility</button>
              )}
              {r.facility_id && r.status === 'Requested' && (
                <button onClick={() => setAssignModal(r)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Assign Collector">
                  <UserCog className="w-4 h-4" />
                </button>
              )}
              {r.status === 'Assigned' && (
                <button onClick={() => handleStatusUpdate(r, 'Pickup Scheduled')} className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100">Schedule</button>
              )}
              {r.status === 'Pickup Scheduled' && (
                <button onClick={() => handleStatusUpdate(r, 'Collection In Progress')} className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-600 hover:bg-amber-100">Start</button>
              )}
              {r.status === 'Collection In Progress' && (
                <button onClick={() => setRecordModal(r)} className="text-xs px-2 py-1 rounded bg-teal-50 text-teal-600 hover:bg-teal-100 font-medium">Record</button>
              )}
              {r.status === 'Collected' && (
                <button onClick={() => handleStatusUpdate(r, 'Completed')} className="text-xs px-2 py-1 rounded bg-green-50 text-green-600 hover:bg-green-100 font-medium">Complete</button>
              )}
            </div>
          ) },
        ]}
        data={filtered}
        emptyMessage="No collection requests"
      />

      <Modal isOpen={!!selectedReq} onClose={() => setSelectedReq(null)} title="Request Details" size="md">
        {selectedReq && (
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-sm text-gray-500">Code</span><span className="text-sm font-mono text-gray-900">{selectedReq.request_code}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Household</span><span className="text-sm text-gray-900">{selectedReq.profiles?.full_name}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Email</span><span className="text-sm text-gray-900">{selectedReq.profiles?.email}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Phone</span><span className="text-sm text-gray-900">{selectedReq.profiles?.phone || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Waste Type</span><span className="text-sm text-gray-900">{selectedReq.waste_type}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Est. Quantity</span><span className="text-sm text-gray-900">{formatKg(selectedReq.estimated_quantity_kg)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Pickup</span><span className="text-sm text-gray-900">{formatDate(selectedReq.preferred_pickup_date)} {selectedReq.preferred_pickup_time}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Address</span><span className="text-sm text-gray-900 text-right max-w-[60%]">{selectedReq.pickup_address}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Status</span><StatusBadge status={selectedReq.status} /></div>
            {selectedReq.assigned_collector && <div className="flex justify-between"><span className="text-sm text-gray-500">Collector</span><span className="text-sm text-gray-900">{selectedReq.assigned_collector}</span></div>}
            {selectedReq.actual_quantity_kg != null && <div className="flex justify-between"><span className="text-sm text-gray-500">Actual Qty</span><span className="text-sm text-gray-900">{formatKg(selectedReq.actual_quantity_kg)}</span></div>}
            {selectedReq.reward_amount != null && <div className="flex justify-between"><span className="text-sm text-gray-500">Reward</span><span className="text-sm text-green-600">{formatCurrency(selectedReq.reward_amount)}</span></div>}
            {selectedReq.notes && <div><span className="text-sm text-gray-500 block mb-1">Notes</span><span className="text-sm text-gray-900">{selectedReq.notes}</span></div>}
          </div>
        )}
      </Modal>

      <Modal isOpen={!!assignModal} onClose={() => setAssignModal(null)} title="Assign Collector" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Select a collector for request <span className="font-mono">{assignModal?.request_code}</span></p>
          <select value={selectedCollector} onChange={(e) => setSelectedCollector(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none">
            <option value="">Select collector...</option>
            {collectors.map((c) => (
              <option key={c.id} value={c.id}>{c.profiles?.full_name} — {c.job_title || c.role}</option>
            ))}
          </select>
          <button onClick={handleAssign} disabled={!selectedCollector} className="w-full py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 transition">
            Assign Collector
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!recordModal} onClose={() => setRecordModal(null)} title="Record Collection" size="sm">
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-gray-50 text-sm space-y-1">
            <p><span className="text-gray-500">Request:</span> <span className="font-mono">{recordModal?.request_code}</span></p>
            <p><span className="text-gray-500">Type:</span> {recordModal?.waste_type}</p>
            <p><span className="text-gray-500">Est. Qty:</span> {recordModal ? formatKg(recordModal.estimated_quantity_kg) : ''}</p>
            <p><span className="text-gray-500">Rate:</span> ₹{rewardRates.find((r) => r.waste_type === recordModal?.waste_type)?.rate_per_kg || 0}/kg</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Actual Quantity (kg)</label>
            <input type="number" value={actualQty} onChange={(e) => setActualQty(e.target.value)} min="0.1" step="0.1" required
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="e.g. 8.5" />
          </div>
          {actualQty && recordModal && (() => {
            const rate = rewardRates.find((r) => r.waste_type === recordModal.waste_type);
            const reward = rate ? parseFloat(actualQty) * rate.rate_per_kg : 0;
            return <p className="text-sm text-green-600 font-medium">Calculated Reward: ₹{reward.toFixed(2)}</p>;
          })()}
          <button onClick={handleRecordCollection} disabled={!actualQty || saving} className="w-full py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2">
            {saving ? (<><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>) : 'Complete Collection'}
          </button>
        </div>
      </Modal>
    </ManagementLayout>
  );
}
