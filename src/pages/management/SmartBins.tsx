import { useEffect, useState, useCallback } from 'react';
import { ManagementLayout } from '@/layouts/ManagementLayout';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge } from '@/components/StatusBadge';
import { ProgressBar } from '@/components/ProgressBar';
import { useAuth } from '@/hooks/useAuth';
import { getSmartBins } from '@/services/inventory';
import { formatDateTime, formatKg, formatPercentage, getBinColorClass } from '@/utils/format';
import { Trash2 } from 'lucide-react';
import type { SmartBin } from '@/types';

export function SmartBinsPage() {
  const { facility } = useAuth();
  const [bins, setBins] = useState<SmartBin[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!facility) return;
    try {
      const data = await getSmartBins(facility.id);
      setBins(data);
    } catch { /* */ } finally { setLoading(false); }
  }, [facility]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ManagementLayout>
      <PageHeader title="Smart Bins" subtitle="Monitor bin fill levels and status" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bins.map((bin) => {
          const colorClass = getBinColorClass(bin.bin_color);
          return (
            <div key={bin.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center`}>
                    <Trash2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{bin.category}</p>
                    <p className="text-xs text-gray-400">{bin.bin_color} bin</p>
                  </div>
                </div>
                <StatusBadge status={bin.status} />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Current</span>
                  <span className="font-medium text-gray-900">{formatKg(bin.current_quantity)} / {formatKg(bin.max_capacity)}</span>
                </div>
                <ProgressBar value={bin.current_quantity} max={bin.max_capacity}
                  color={bin.status === 'Full' ? 'bg-red-500' : bin.status === 'Nearly Full' ? 'bg-orange-500' : colorClass} height="h-3" showLabel />
                <div className="flex justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
                  <span>Fill: {formatPercentage(bin.fill_percentage)}</span>
                  <span>Updated: {formatDateTime(bin.last_updated)}</span>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </ManagementLayout>
  );
}
