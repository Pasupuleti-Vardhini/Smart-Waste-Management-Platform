import { useEffect, useState, useCallback } from 'react';
import { ManagementLayout } from '@/layouts/ManagementLayout';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ProgressBar } from '@/components/ProgressBar';
import { useAuth } from '@/hooks/useAuth';
import { getInventory } from '@/services/inventory';
import { formatDateTime, formatKg, formatPercentage, getCategoryColor } from '@/utils/format';
import { Boxes } from 'lucide-react';
import type { StorageInventory } from '@/types';

export function InventoryPage() {
  const { facility } = useAuth();
  const [inventory, setInventory] = useState<StorageInventory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!facility) return;
    try {
      const data = await getInventory(facility.id);
      setInventory(data);
    } catch { /* */ } finally { setLoading(false); }
  }, [facility]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingSpinner fullScreen />;

  const totalProcessed = inventory.reduce((s, i) => s + i.processed_quantity, 0);
  const totalStored = inventory.reduce((s, i) => s + i.stored_quantity, 0);
  const totalDispatched = inventory.reduce((s, i) => s + i.dispatched_quantity, 0);
  const totalAvailable = inventory.reduce((s, i) => s + i.available_quantity, 0);

  return (
    <ManagementLayout>
      <PageHeader title="Storage & Inventory" subtitle="Track processed, stored, and dispatched waste by category" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Processed</p><p className="text-2xl font-bold text-blue-600 mt-1">{formatKg(totalProcessed)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Currently Stored</p><p className="text-2xl font-bold text-teal-600 mt-1">{formatKg(totalStored)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Dispatched</p><p className="text-2xl font-bold text-green-600 mt-1">{formatKg(totalDispatched)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Available</p><p className="text-2xl font-bold text-amber-600 mt-1">{formatKg(totalAvailable)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inventory.map((inv) => {
          const cc = getCategoryColor(inv.category);
          return (
            <div key={inv.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-lg ${cc.bg}`}><Boxes className={`w-5 h-5 ${cc.text}`} /></div>
                <h3 className="font-semibold text-gray-900">{inv.category}</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Processed</span><span className="font-medium text-gray-900">{formatKg(inv.processed_quantity)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Stored</span><span className="font-medium text-gray-900">{formatKg(inv.stored_quantity)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Dispatched</span><span className="font-medium text-gray-900">{formatKg(inv.dispatched_quantity)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Available</span><span className="font-medium text-gray-900">{formatKg(inv.available_quantity)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Capacity</span><span className="font-medium text-gray-900">{formatKg(inv.storage_capacity)}</span></div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Storage Fill</span><span>{formatPercentage(inv.fill_percentage)}</span></div>
                <ProgressBar value={inv.stored_quantity} max={inv.storage_capacity} color={inv.fill_percentage >= 90 ? 'bg-red-500' : inv.fill_percentage >= 70 ? 'bg-orange-500' : 'bg-teal-500'} />
              </div>
              <p className="text-xs text-gray-400 mt-2">Last updated: {formatDateTime(inv.last_updated)}</p>
            </div>
          );
        })}
      </div>
    </ManagementLayout>
  );
}
