import { useEffect, useState } from 'react';
import { HouseholdLayout } from '@/layouts/HouseholdLayout';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { getMyCollectionRecords } from '@/services/collection';
import { formatDate, formatKg, formatCurrency } from '@/utils/format';
import type { CollectionRecord } from '@/types';

export function CollectionHistoryPage() {
  const [records, setRecords] = useState<CollectionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyCollectionRecords()
      .then(setRecords)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <HouseholdLayout>
      <PageHeader title="Collection History" subtitle="View all your completed waste collections" />

      <DataTable
        columns={[
          { key: 'request_code', header: 'Collection ID', render: (r) => <span className="font-mono text-xs">{r.collection_request_id.slice(0, 8)}</span> },
          { key: 'collected_at', header: 'Date', render: (r) => formatDate(r.collected_at) },
          { key: 'waste_type', header: 'Waste Type' },
          { key: 'estimated_quantity_kg', header: 'Estimated Qty', render: (r) => formatKg(r.estimated_quantity_kg) },
          { key: 'actual_quantity_kg', header: 'Actual Qty', render: (r) => formatKg(r.actual_quantity_kg) },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'reward_amount', header: 'Reward', render: (r) => <span className="font-medium text-green-600">{formatCurrency(r.reward_amount)}</span> },
        ]}
        data={records}
        emptyMessage="No collection history yet"
      />
    </HouseholdLayout>
  );
}
