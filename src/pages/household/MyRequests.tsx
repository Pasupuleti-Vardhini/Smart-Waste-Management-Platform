import { useEffect, useState } from 'react';
import { HouseholdLayout } from '@/layouts/HouseholdLayout';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Modal } from '@/components/Modal';
import { getMyRequests, cancelRequest } from '@/services/collection';
import { showToast } from '@/components/Toast';
import { formatDate, formatKg, formatCurrency } from '@/utils/format';
import { PlusCircle, Eye, XCircle, MapPin, Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CollectionRequest } from '@/types';

export function MyRequestsPage() {
  const [requests, setRequests] = useState<CollectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CollectionRequest | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await getMyRequests();
      setRequests(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    try {
      await cancelRequest(id);
      showToast('Request cancelled', 'success');
      loadRequests();
    } catch (err) {
      showToast('Failed to cancel request', 'error');
    }
  };

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);
  const filters = ['all', 'Requested', 'Assigned', 'Pickup Scheduled', 'Collection In Progress', 'Collected', 'Completed', 'Cancelled'];

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <HouseholdLayout>
      <PageHeader
        title="My Requests"
        subtitle="Track all your waste collection requests"
        actions={
          <Link to="/household/new-request" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition">
            <PlusCircle className="w-4 h-4" /> New Request
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === f ? 'bg-teal-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 mb-4">No requests found</p>
          <Link to="/household/new-request" className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium">
            <PlusCircle className="w-5 h-5" /> Place your first request
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-mono text-gray-500">{req.request_code}</span>
                <StatusBadge status={req.status} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 w-20">Type</span>
                  <span className="font-medium text-gray-900">{req.waste_type}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 w-20">Est. Qty</span>
                  <span className="font-medium text-gray-900">{formatKg(req.estimated_quantity_kg)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{formatDate(req.preferred_pickup_date)} {req.preferred_pickup_time && `at ${req.preferred_pickup_time}`}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <span className="text-gray-600 line-clamp-2">{req.pickup_address}</span>
                </div>
                {req.actual_quantity_kg != null && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400 w-20">Actual</span>
                    <span className="font-medium text-gray-900">{formatKg(req.actual_quantity_kg)}</span>
                  </div>
                )}
                {req.reward_amount != null && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400 w-20">Reward</span>
                    <span className="font-medium text-green-600">{formatCurrency(req.reward_amount)}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => setSelected(req)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-sm font-medium text-teal-600 hover:bg-teal-50 transition">
                  <Eye className="w-4 h-4" /> View
                </button>
                {['Requested'].includes(req.status) && (
                  <button onClick={() => handleCancel(req.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition">
                    <XCircle className="w-4 h-4" /> Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Request Details" size="md">
        {selected && (
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-sm text-gray-500">Request Code</span><span className="text-sm font-mono text-gray-900">{selected.request_code}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Status</span><StatusBadge status={selected.status} /></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Waste Type</span><span className="text-sm font-medium text-gray-900">{selected.waste_type}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Estimated Quantity</span><span className="text-sm font-medium text-gray-900">{formatKg(selected.estimated_quantity_kg)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Pickup Date</span><span className="text-sm font-medium text-gray-900">{formatDate(selected.preferred_pickup_date)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Pickup Time</span><span className="text-sm font-medium text-gray-900">{selected.preferred_pickup_time || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Address</span><span className="text-sm text-gray-900 text-right max-w-[60%]">{selected.pickup_address}</span></div>
            {selected.assigned_collector && <div className="flex justify-between"><span className="text-sm text-gray-500">Collector</span><span className="text-sm font-medium text-gray-900">{selected.assigned_collector}</span></div>}
            {selected.actual_quantity_kg != null && <div className="flex justify-between"><span className="text-sm text-gray-500">Actual Quantity</span><span className="text-sm font-medium text-gray-900">{formatKg(selected.actual_quantity_kg)}</span></div>}
            {selected.reward_amount != null && <div className="flex justify-between"><span className="text-sm text-gray-500">Reward</span><span className="text-sm font-medium text-green-600">{formatCurrency(selected.reward_amount)}</span></div>}
            {selected.notes && <div><span className="text-sm text-gray-500 block mb-1">Notes</span><span className="text-sm text-gray-900">{selected.notes}</span></div>}
            <div className="flex justify-between"><span className="text-sm text-gray-500">Created</span><span className="text-sm text-gray-900">{formatDate(selected.created_at)}</span></div>
          </div>
        )}
      </Modal>
    </HouseholdLayout>
  );
}
