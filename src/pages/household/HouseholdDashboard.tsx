import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, CheckCircle, Scale, Gift, Clock, PlusCircle, ArrowRight } from 'lucide-react';
import { HouseholdLayout } from '@/layouts/HouseholdLayout';
import { KpiCard } from '@/components/KpiCard';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PageHeader } from '@/components/PageHeader';
import { getMyRequests, getMyCollectionRecords } from '@/services/collection';
import { formatDate, formatKg, formatCurrency } from '@/utils/format';
import type { CollectionRequest, CollectionRecord } from '@/types';

export function HouseholdDashboard() {
  const [requests, setRequests] = useState<CollectionRequest[]>([]);
  const [records, setRecords] = useState<CollectionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [reqs, recs] = await Promise.all([getMyRequests(), getMyCollectionRecords()]);
        setRequests(reqs);
        setRecords(recs);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner fullScreen />;

  const activeRequests = requests.filter((r) => !['Completed', 'Cancelled'].includes(r.status));
  const completedRequests = requests.filter((r) => r.status === 'Completed');
  const totalWaste = records.reduce((sum, r) => sum + (r.actual_quantity_kg || 0), 0);
  const totalRewards = records.reduce((sum, r) => sum + (r.reward_amount || 0), 0);
  const latestRequest = requests[0];

  return (
    <HouseholdLayout>
      <PageHeader title="Dashboard" subtitle="Welcome back! Here's your waste collection overview." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Active Requests" value={activeRequests.length} icon={Package} color="text-blue-600" />
        <KpiCard label="Completed Collections" value={completedRequests.length} icon={CheckCircle} color="text-green-600" />
        <KpiCard label="Total Waste Collected" value={formatKg(totalWaste)} icon={Scale} color="text-teal-600" />
        <KpiCard label="Total Rewards" value={formatCurrency(totalRewards)} icon={Gift} color="text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Latest Request</h3>
            <Link to="/household/requests" className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {latestRequest ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Request ID</span>
                <span className="text-sm font-medium text-gray-900">{latestRequest.request_code}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Waste Type</span>
                <span className="text-sm font-medium text-gray-900">{latestRequest.waste_type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Estimated Quantity</span>
                <span className="text-sm font-medium text-gray-900">{formatKg(latestRequest.estimated_quantity_kg)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Pickup Date</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(latestRequest.preferred_pickup_date)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <StatusBadge status={latestRequest.status} />
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No requests yet</p>
              <Link to="/household/new-request" className="mt-3 inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700">
                <PlusCircle className="w-4 h-4" /> Place your first request
              </Link>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Collections</h3>
            <Link to="/household/history" className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {records.length > 0 ? (
            <div className="space-y-3">
              {records.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.waste_type}</p>
                    <p className="text-xs text-gray-400">{formatDate(r.collected_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{formatKg(r.actual_quantity_kg)}</p>
                    <p className="text-xs text-green-600">{formatCurrency(r.reward_amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Scale className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No collections yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <Link
          to="/household/new-request"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition shadow-sm"
        >
          <PlusCircle className="w-5 h-5" />
          Place New Collection Request
        </Link>
      </div>
    </HouseholdLayout>
  );
}
