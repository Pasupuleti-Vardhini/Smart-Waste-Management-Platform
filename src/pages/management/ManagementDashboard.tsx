import { useEffect, useState } from 'react';
import { ManagementLayout } from '@/layouts/ManagementLayout';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { DonutChart } from '@/components/DonutChart';
import { BarChart } from '@/components/BarChart';
import { LineChart } from '@/components/LineChart';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DemoBadge } from '@/components/DemoBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Package, CheckCircle, Boxes, Send, Truck, Layers, Gift, ClipboardList, Bell } from 'lucide-react';
import { formatKg, formatNumber, formatCurrency, formatDateTime } from '@/utils/format';
import { getSeverityColor } from '@/utils/format';
import type { StorageInventory, CollectionRequest, MaterialRequirement, Alert, SystemHistory } from '@/types';

const CAT_COLORS_HEX = ['#3b82f6', '#22c55e', '#6b7280', '#facc15', '#f97316'];
const CAT_COLORS_BG = ['bg-blue-500', 'bg-green-500', 'bg-gray-500', 'bg-yellow-400', 'bg-orange-500'];
const CAT_ORDER = ['Plastic', 'Organic', 'Metal', 'Fabric', 'E-Waste'];

export function ManagementDashboard() {
  const { facility } = useAuth();
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<StorageInventory[]>([]);
  const [requests, setRequests] = useState<CollectionRequest[]>([]);
  const [requirements, setRequirements] = useState<MaterialRequirement[]>([]);
  const [totalReceived, setTotalReceived] = useState(0);
  const [totalRewards, setTotalRewards] = useState(0);
  const [recentActivity, setRecentActivity] = useState<SystemHistory[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [recvTrend, setRecvTrend] = useState<{ label: string; value: number }[]>([]);
  const [collTrend, setCollTrend] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    if (!facility) return;
    (async () => {
      try {
        const [invRes, reqRes, matRes, recvRes, dispRes, collRes, histRes, alertRes] = await Promise.all([
          supabase.from('storage_inventory').select('*').eq('facility_id', facility.id),
          supabase.from('collection_requests').select('*').eq('facility_id', facility.id),
          supabase.from('material_requirements').select('*').eq('facility_id', facility.id),
          supabase.from('waste_receiving').select('quantity_kg, created_at').eq('facility_id', facility.id).order('created_at', { ascending: true }),
          supabase.from('dispatch_records').select('quantity_kg').eq('facility_id', facility.id),
          supabase.from('collection_records').select('reward_amount, collected_at').eq('facility_id', facility.id).order('collected_at', { ascending: true }),
          supabase.from('system_history').select('*').eq('facility_id', facility.id).order('created_at', { ascending: false }).limit(8),
          supabase.from('alerts').select('*').eq('facility_id', facility.id).order('created_at', { ascending: false }).limit(5),
        ]);

        setInventory(invRes.data as StorageInventory[] || []);
        setRequests(reqRes.data as CollectionRequest[] || []);
        setRequirements(matRes.data as MaterialRequirement[] || []);
        setTotalReceived((recvRes.data || []).reduce((s: number, r: { quantity_kg: number }) => s + r.quantity_kg, 0));
        setTotalRewards((collRes.data || []).reduce((s: number, r: { reward_amount: number }) => s + r.reward_amount, 0));
        setRecentActivity(histRes.data as SystemHistory[] || []);
        setRecentAlerts(alertRes.data as Alert[] || []);

        // Build receiving trend (last 10 days)
        const recvData = (recvRes.data || []) as { quantity_kg: number; created_at: string }[];
        const recvGrouped: Record<string, number> = {};
        recvData.forEach((r) => {
          const d = new Date(r.created_at);
          const key = `${d.getMonth() + 1}/${d.getDate()}`;
          recvGrouped[key] = (recvGrouped[key] || 0) + r.quantity_kg;
        });
        setRecvTrend(Object.entries(recvGrouped).slice(-10).map(([label, value]) => ({ label, value })));

        // Build collection trend
        const collData = (collRes.data || []) as { reward_amount: number; collected_at: string }[];
        const collGrouped: Record<string, number> = {};
        collData.forEach((r) => {
          const d = new Date(r.collected_at);
          const key = `${d.getMonth() + 1}/${d.getDate()}`;
          collGrouped[key] = (collGrouped[key] || 0) + 1;
        });
        setCollTrend(Object.entries(collGrouped).slice(-10).map(([label, value]) => ({ label, value })));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [facility]);

  if (loading) return <LoadingSpinner fullScreen />;

  const totalProcessed = inventory.reduce((s, i) => s + i.processed_quantity, 0);
  const totalStored = inventory.reduce((s, i) => s + i.stored_quantity, 0);
  const totalDisp = inventory.reduce((s, i) => s + i.dispatched_quantity, 0);
  const activeRequests = requests.filter((r) => ['Requested', 'Assigned', 'Pickup Scheduled', 'Collection In Progress', 'Collected'].includes(r.status));
  const activeReqs = requirements.filter((r) => ['Collecting', 'Ready for Dispatch'].includes(r.status));
  const totalCollections = requests.filter((r) => r.status === 'Completed').length;

  const categoryData = inventory.map((i) => ({
    label: i.category,
    value: i.stored_quantity,
    color: CAT_COLORS_BG[CAT_ORDER.indexOf(i.category)] || 'bg-gray-400',
  }));

  const donutData = inventory.map((i) => ({
    label: i.category,
    value: i.processed_quantity,
    color: CAT_COLORS_HEX[CAT_ORDER.indexOf(i.category)] || '#9ca3af',
  }));

  const dispBarData = inventory.map((i) => ({
    label: i.category,
    value: i.dispatched_quantity,
    color: CAT_COLORS_BG[CAT_ORDER.indexOf(i.category)] || 'bg-gray-400',
  }));

  return (
    <ManagementLayout>
      <PageHeader title="Dashboard" subtitle="Overview of waste management operations" badge={<DemoBadge />} />

      {/* KPI Cards - 8 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Waste Received" value={formatKg(totalReceived)} icon={Package} color="text-teal-600" />
        <KpiCard label="Total Waste Processed" value={formatKg(totalProcessed)} icon={CheckCircle} color="text-blue-600" />
        <KpiCard label="Currently Stored" value={formatKg(totalStored)} icon={Boxes} color="text-amber-600" />
        <KpiCard label="Total Dispatched" value={formatKg(totalDisp)} icon={Send} color="text-green-600" />
        <KpiCard label="Active Collection Requests" value={activeRequests.length} icon={Truck} color="text-purple-600" />
        <KpiCard label="Active Material Requirements" value={activeReqs.length} icon={Layers} color="text-orange-600" />
        <KpiCard label="Total Collections" value={totalCollections} icon={ClipboardList} color="text-cyan-600" />
        <KpiCard label="Total Rewards Issued" value={formatCurrency(totalRewards)} icon={Gift} color="text-amber-600" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Waste Received Trend</h3>
          {recvTrend.length > 0 ? <LineChart data={recvTrend} color="#0d9488" /> : <p className="text-center text-gray-400 py-8 text-sm">No receiving data yet</p>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Waste by Category (Processed)</h3>
          <DonutChart data={donutData} />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Stored by Category</h3>
          <BarChart data={categoryData} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Dispatched by Category</h3>
          <BarChart data={dispBarData} />
        </div>
      </div>

      {/* Charts row 3 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Collection Trend</h3>
        {collTrend.length > 0 ? <LineChart data={collTrend} color="#3b82f6" /> : <p className="text-center text-gray-400 py-8 text-sm">No collection data yet</p>}
      </div>

      {/* Category Summary Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Category Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Processed</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Stored</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Dispatched</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Available</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inventory.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatKg(inv.processed_quantity)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatKg(inv.stored_quantity)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatKg(inv.dispatched_quantity)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatKg(inv.available_quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((act) => (
                <div key={act.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{act.action}</p>
                    <p className="text-xs text-gray-400 truncate">{act.description}</p>
                    <p className="text-xs text-gray-300 mt-0.5">{formatDateTime(act.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8 text-sm">No recent activity</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Alerts</h3>
            <Bell className="w-5 h-5 text-gray-400" />
          </div>
          {recentAlerts.length > 0 ? (
            <div className="space-y-2">
              {recentAlerts.map((alert) => {
                const sc = getSeverityColor(alert.severity);
                return (
                  <div key={alert.id} className={`rounded-lg border p-3 ${sc.border} ${sc.bg}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                      <StatusBadge status={alert.severity} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{alert.message}</p>
                    <p className="text-xs text-gray-300 mt-1">{formatDateTime(alert.created_at)}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8 text-sm">No alerts</p>
          )}
        </div>
      </div>
    </ManagementLayout>
  );
}
