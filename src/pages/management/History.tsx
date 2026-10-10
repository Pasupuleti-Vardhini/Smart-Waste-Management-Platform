import { useEffect, useState, useCallback } from 'react';
import { ManagementLayout } from '@/layouts/ManagementLayout';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { getHistory } from '@/services/management';
import { formatDateTime } from '@/utils/format';
import type { SystemHistory, HistoryCategory } from '@/types';

const CATEGORIES: HistoryCategory[] = ['Collection', 'Waste Receiving', 'AI Sorting', 'Manual Review', 'Storage', 'Dispatch', 'Alert', 'Management'];

export function HistoryPage() {
  const { facility } = useAuth();
  const [history, setHistory] = useState<SystemHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('all');

  const loadData = useCallback(async () => {
    if (!facility) return;
    try { setHistory(await getHistory(facility.id, tab === 'all' ? undefined : tab)); }
    catch { /* */ } finally { setLoading(false); }
  }, [facility, tab]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ManagementLayout>
      <PageHeader title="History" subtitle="Complete audit trail of all system activities" />

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setTab('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${tab === 'all' ? 'bg-teal-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>All</button>
        {CATEGORIES.map((c) => <button key={c} onClick={() => setTab(c)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${tab === c ? 'bg-teal-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{c}</button>)}
      </div>

      <DataTable
        columns={[
          { key: 'created_at', header: 'Date/Time', render: (r) => formatDateTime(r.created_at) },
          { key: 'category', header: 'Category' },
          { key: 'action', header: 'Action', render: (r) => <span className="font-medium">{r.action}</span> },
          { key: 'description', header: 'Description' },
          { key: 'performed_by_name', header: 'By', render: (r) => r.performed_by_name || 'System' },
        ]}
        data={history}
        emptyMessage="No history records"
      />
    </ManagementLayout>
  );
}
