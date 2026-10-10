import { useEffect, useState } from 'react';
import { ManagementLayout } from '@/layouts/ManagementLayout';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { BarChart } from '@/components/BarChart';
import { DonutChart } from '@/components/DonutChart';
import { LineChart } from '@/components/LineChart';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DemoBadge } from '@/components/DemoBadge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { formatKg, formatNumber } from '@/utils/format';
import { TrendingUp, ScanLine, ClipboardCheck, Gift, BarChart3 } from 'lucide-react';

export function AnalyticsPage() {
  const { facility } = useAuth();
  const [loading, setLoading] = useState(true);
  const [inv, setInv] = useState<{ category: string; processed_quantity: number; stored_quantity: number; dispatched_quantity: number }[]>([]);
  const [aiStats, setAiStats] = useState({ total: 0, high: 0, low: 0, corrections: 0 });
  const [reviewStats, setReviewStats] = useState({ total: 0, confirmed: 0, changed: 0, rejected: 0 });
  const [collStats, setCollStats] = useState({ total: 0, completed: 0, totalQty: 0, totalReward: 0 });
  const [trendData, setTrendData] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    if (!facility) return;
    (async () => {
      try {
        const [invRes, aiRes, revRes, collRes, recvRes] = await Promise.all([
          supabase.from('storage_inventory').select('*').eq('facility_id', facility.id),
          supabase.from('ai_detections').select('confidence_status, review_status').eq('facility_id', facility.id),
          supabase.from('manual_reviews').select('review_action').eq('facility_id', facility.id),
          supabase.from('collection_requests').select('status, actual_quantity_kg, reward_amount').eq('facility_id', facility.id),
          supabase.from('waste_receiving').select('quantity_kg, created_at').eq('facility_id', facility.id).order('created_at', { ascending: true }),
        ]);
        setInv(invRes.data || []);
        const ai = aiRes.data || [];
        setAiStats({ total: ai.length, high: ai.filter((a: { confidence_status: string }) => a.confidence_status === 'High').length, low: ai.filter((a: { confidence_status: string }) => a.confidence_status === 'Low').length, corrections: ai.filter((a: { review_status: string }) => a.review_status === 'Changed').length });
        const rev = revRes.data || [];
        setReviewStats({ total: rev.length, confirmed: rev.filter((r: { review_action: string }) => r.review_action === 'Confirmed').length, changed: rev.filter((r: { review_action: string }) => r.review_action === 'Changed').length, rejected: rev.filter((r: { review_action: string }) => r.review_action === 'Rejected').length });
        const coll = collRes.data || [];
        setCollStats({ total: coll.length, completed: coll.filter((c: { status: string }) => c.status === 'Completed').length, totalQty: coll.reduce((s: number, c: { actual_quantity_kg: number | null }) => s + (c.actual_quantity_kg || 0), 0), totalReward: coll.reduce((s: number, c: { reward_amount: number | null }) => s + (c.reward_amount || 0), 0) });
        const recv = recvRes.data || [];
        const grouped: Record<string, number> = {};
        recv.forEach((r: { quantity_kg: number; created_at: string }) => {
          const d = new Date(r.created_at); const key = `${d.getMonth() + 1}/${d.getDate()}`;
          grouped[key] = (grouped[key] || 0) + r.quantity_kg;
        });
        setTrendData(Object.entries(grouped).slice(-10).map(([label, value]) => ({ label, value })));
      } catch { /* */ } finally { setLoading(false); }
    })();
  }, [facility]);

  if (loading) return <LoadingSpinner fullScreen />;

  const catColors = ['#3b82f6', '#22c55e', '#6b7280', '#facc15', '#f97316'];
  const donutData = inv.map((i, idx) => ({ label: i.category, value: i.processed_quantity, color: catColors[idx] }));
  const barData = inv.map((i, idx) => ({ label: i.category, value: i.stored_quantity, color: ['bg-blue-500', 'bg-green-500', 'bg-gray-500', 'bg-yellow-400', 'bg-orange-500'][idx] }));
  const dispData = inv.map((i, idx) => ({ label: i.category, value: i.dispatched_quantity, color: ['bg-blue-500', 'bg-green-500', 'bg-gray-500', 'bg-yellow-400', 'bg-orange-500'][idx] }));

  return (
    <ManagementLayout>
      <PageHeader title="Analytics" subtitle="Comprehensive waste management analytics" badge={<DemoBadge />} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total AI Detections" value={aiStats.total} icon={ScanLine} color="text-teal-600" />
        <KpiCard label="Low Confidence" value={aiStats.low} icon={BarChart3} color="text-orange-600" />
        <KpiCard label="Manual Reviews" value={reviewStats.total} icon={ClipboardCheck} color="text-blue-600" />
        <KpiCard label="Total Rewards Issued" value={`₹${formatNumber(collStats.totalReward)}`} icon={Gift} color="text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Category Distribution (Processed)</h3>
          <DonutChart data={donutData} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Waste Received Over Time</h3>
          <LineChart data={trendData} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Stored by Category</h3>
          <BarChart data={barData} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Dispatched by Category</h3>
          <BarChart data={dispData} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-4">AI & Review Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-teal-50"><p className="text-xs text-teal-600">Total Detections</p><p className="text-xl font-bold text-teal-700">{aiStats.total}</p></div>
          <div className="p-3 rounded-lg bg-green-50"><p className="text-xs text-green-600">High Confidence</p><p className="text-xl font-bold text-green-700">{aiStats.high}</p></div>
          <div className="p-3 rounded-lg bg-orange-50"><p className="text-xs text-orange-600">Low Confidence</p><p className="text-xl font-bold text-orange-700">{aiStats.low}</p></div>
          <div className="p-3 rounded-lg bg-red-50"><p className="text-xs text-red-600">AI Corrections</p><p className="text-xl font-bold text-red-700">{aiStats.corrections}</p></div>
          <div className="p-3 rounded-lg bg-blue-50"><p className="text-xs text-blue-600">Reviews Confirmed</p><p className="text-xl font-bold text-blue-700">{reviewStats.confirmed}</p></div>
          <div className="p-3 rounded-lg bg-purple-50"><p className="text-xs text-purple-600">Categories Changed</p><p className="text-xl font-bold text-purple-700">{reviewStats.changed}</p></div>
          <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-600">Rejected</p><p className="text-xl font-bold text-gray-700">{reviewStats.rejected}</p></div>
          <div className="p-3 rounded-lg bg-amber-50"><p className="text-xs text-amber-600">Collections Done</p><p className="text-xl font-bold text-amber-700">{collStats.completed}</p></div>
        </div>
      </div>
    </ManagementLayout>
  );
}
