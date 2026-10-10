import { useEffect, useState } from 'react';
import { HouseholdLayout } from '@/layouts/HouseholdLayout';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { DataTable } from '@/components/DataTable';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { getMyCollectionRecords } from '@/services/collection';
import { formatDate, formatKg, formatCurrency, formatNumber } from '@/utils/format';
import { Gift, Scale, TrendingUp, Calendar } from 'lucide-react';
import type { CollectionRecord } from '@/types';

export function RewardsPage() {
  const [records, setRecords] = useState<CollectionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyCollectionRecords()
      .then(setRecords)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner fullScreen />;

  const totalEligibleQty = records.reduce((s, r) => s + r.actual_quantity_kg, 0);
  const totalRewards = records.reduce((s, r) => s + r.reward_amount, 0);
  const avgRate = totalEligibleQty > 0 ? totalRewards / totalEligibleQty : 0;

  return (
    <HouseholdLayout>
      <PageHeader title="Rewards" subtitle="Track your rewards from responsible waste disposal" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Total Eligible Quantity" value={formatKg(totalEligibleQty)} icon={Scale} color="text-teal-600" />
        <KpiCard label="Average Rate" value={`₹${formatNumber(avgRate)}/kg`} icon={TrendingUp} color="text-blue-600" />
        <KpiCard label="Total Rewards Earned" value={formatCurrency(totalRewards)} icon={Gift} color="text-amber-600" />
      </div>

      <DataTable
        columns={[
          { key: 'collected_at', header: 'Date', render: (r) => formatDate(r.collected_at) },
          { key: 'collection_request_id', header: 'Collection ID', render: (r) => <span className="font-mono text-xs">{r.collection_request_id.slice(0, 8)}</span> },
          { key: 'waste_type', header: 'Waste Type' },
          { key: 'actual_quantity_kg', header: 'Eligible Qty', render: (r) => formatKg(r.actual_quantity_kg) },
          { key: 'reward_rate', header: 'Rate/kg', render: (r) => `₹${formatNumber(r.reward_rate)}` },
          { key: 'reward_amount', header: 'Reward Amount', render: (r) => <span className="font-medium text-green-600">{formatCurrency(r.reward_amount)}</span> },
        ]}
        data={records}
        emptyMessage="No rewards earned yet. Complete a collection to earn rewards!"
      />
    </HouseholdLayout>
  );
}
