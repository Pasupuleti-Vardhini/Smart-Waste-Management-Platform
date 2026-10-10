import { useEffect, useState, useCallback } from 'react';
import { ManagementLayout } from '@/layouts/ManagementLayout';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { formatKg, formatNumber, formatDate } from '@/utils/format';
import { Printer } from 'lucide-react';

type Period = 'daily' | 'weekly' | 'monthly';

export function ReportsPage() {
  const { facility } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('daily');
  const [data, setData] = useState<{
    received: number; processed: number; stored: number; dispatched: number;
    byCategory: { category: string; processed: number; stored: number; dispatched: number }[];
    collections: { total: number; completed: number; wet: number; dry: number; rewards: number };
    ai: { total: number; high: number; low: number };
    reviews: number; alerts: number; requirements: number;
  } | null>(null);

  const loadData = useCallback(async () => {
    if (!facility) return;
    const now = new Date();
    let startDate = new Date(now);
    if (period === 'daily') startDate.setDate(now.getDate() - 1);
    else if (period === 'weekly') startDate.setDate(now.getDate() - 7);
    else startDate.setMonth(now.getMonth() - 1);
    const startStr = startDate.toISOString();

    try {
      const [recv, inv, coll, ai, rev, alerts, reqs] = await Promise.all([
        supabase.from('waste_receiving').select('quantity_kg').eq('facility_id', facility.id).gte('created_at', startStr),
        supabase.from('storage_inventory').select('*').eq('facility_id', facility.id),
        supabase.from('collection_requests').select('*').eq('facility_id', facility.id).gte('created_at', startStr),
        supabase.from('ai_detections').select('confidence_status').eq('facility_id', facility.id).gte('created_at', startStr),
        supabase.from('manual_reviews').select('id').eq('facility_id', facility.id).gte('reviewed_at', startStr),
        supabase.from('alerts').select('id').eq('facility_id', facility.id).gte('created_at', startStr),
        supabase.from('material_requirements').select('id').eq('facility_id', facility.id),
      ]);

      const recvData = recv.data || [];
      const invData = inv.data || [];
      const collData = coll.data || [];
      const aiData = ai.data || [];
      const totalReceived = recvData.reduce((s: number, r: { quantity_kg: number }) => s + r.quantity_kg, 0);
      const totalProcessed = invData.reduce((s: number, i: { processed_quantity: number }) => s + i.processed_quantity, 0);
      const totalStored = invData.reduce((s: number, i: { stored_quantity: number }) => s + i.stored_quantity, 0);
      const totalDispatched = invData.reduce((s: number, i: { dispatched_quantity: number }) => s + i.dispatched_quantity, 0);
      const completed = collData.filter((c: { status: string }) => c.status === 'Completed').length;
      const wet = collData.filter((c: { waste_type: string }) => c.waste_type === 'Wet Waste').reduce((s: number, c: { actual_quantity_kg: number | null }) => s + (c.actual_quantity_kg || 0), 0);
      const dry = collData.filter((c: { waste_type: string }) => c.waste_type === 'Dry Waste').reduce((s: number, c: { actual_quantity_kg: number | null }) => s + (c.actual_quantity_kg || 0), 0);
      const rewards = collData.reduce((s: number, c: { reward_amount: number | null }) => s + (c.reward_amount || 0), 0);

      setData({
        received: totalReceived, processed: totalProcessed, stored: totalStored, dispatched: totalDispatched,
        byCategory: invData.map((i: { category: string; processed_quantity: number; stored_quantity: number; dispatched_quantity: number }) => ({ category: i.category, processed: i.processed_quantity, stored: i.stored_quantity, dispatched: i.dispatched_quantity })),
        collections: { total: collData.length, completed, wet, dry, rewards },
        ai: { total: aiData.length, high: aiData.filter((a: { confidence_status: string }) => a.confidence_status === 'High').length, low: aiData.filter((a: { confidence_status: string }) => a.confidence_status === 'Low').length },
        reviews: (rev.data || []).length, alerts: (alerts.data || []).length, requirements: (reqs.data || []).length,
      });
    } catch { /* */ } finally { setLoading(false); }
  }, [facility, period]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePrint = () => window.print();

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ManagementLayout>
      <PageHeader title="Reports" subtitle="Generate waste management reports"
        actions={
          <div className="flex items-center gap-2">
            <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none">
              <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
            </select>
            <button onClick={handlePrint} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition"><Printer className="w-4 h-4" /> Print</button>
          </div>
        } />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 print:border-0 print:shadow-none">
        <div className="text-center mb-6 print:mb-4">
          <h2 className="text-xl font-bold text-gray-900">GreenCycle Waste Management Report</h2>
          <p className="text-sm text-gray-500">{period.charAt(0).toUpperCase() + period.slice(1)} Report — {formatDate(new Date())}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-teal-50"><p className="text-xs text-teal-600">Waste Received</p><p className="text-xl font-bold text-teal-700">{formatKg(data?.received || 0)}</p></div>
          <div className="p-4 rounded-lg bg-blue-50"><p className="text-xs text-blue-600">Waste Processed</p><p className="text-xl font-bold text-blue-700">{formatKg(data?.processed || 0)}</p></div>
          <div className="p-4 rounded-lg bg-amber-50"><p className="text-xs text-amber-600">Waste Stored</p><p className="text-xl font-bold text-amber-700">{formatKg(data?.stored || 0)}</p></div>
          <div className="p-4 rounded-lg bg-green-50"><p className="text-xs text-green-600">Waste Dispatched</p><p className="text-xl font-bold text-green-700">{formatKg(data?.dispatched || 0)}</p></div>
        </div>

        <h3 className="font-semibold text-gray-900 mb-3">Category Breakdown</h3>
        <table className="w-full mb-6 text-sm">
          <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Category</th><th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Processed</th><th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Stored</th><th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Dispatched</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {data?.byCategory.map((c) => <tr key={c.category}><td className="px-3 py-2 font-medium">{c.category}</td><td className="px-3 py-2">{formatKg(c.processed)}</td><td className="px-3 py-2">{formatKg(c.stored)}</td><td className="px-3 py-2">{formatKg(c.dispatched)}</td></tr>)}
          </tbody>
        </table>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Collection Statistics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Total Requests</span><span className="font-medium">{data?.collections.total || 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Completed</span><span className="font-medium">{data?.collections.completed || 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Wet Waste</span><span className="font-medium">{formatKg(data?.collections.wet || 0)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Dry Waste</span><span className="font-medium">{formatKg(data?.collections.dry || 0)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Rewards Issued</span><span className="font-medium">₹{formatNumber(data?.collections.rewards || 0)}</span></div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">AI & System Statistics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">AI Detections</span><span className="font-medium">{data?.ai.total || 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">High Confidence</span><span className="font-medium">{data?.ai.high || 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Low Confidence</span><span className="font-medium">{data?.ai.low || 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Manual Reviews</span><span className="font-medium">{data?.reviews || 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Alerts</span><span className="font-medium">{data?.alerts || 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Material Requirements</span><span className="font-medium">{data?.requirements || 0}</span></div>
            </div>
          </div>
        </div>
      </div>
    </ManagementLayout>
  );
}
