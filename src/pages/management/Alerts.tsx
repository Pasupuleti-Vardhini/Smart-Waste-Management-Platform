import { useEffect, useState, useCallback } from 'react';
import { ManagementLayout } from '@/layouts/ManagementLayout';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Modal } from '@/components/Modal';
import { showToast } from '@/components/Toast';
import { useAuth } from '@/hooks/useAuth';
import { getAlerts, markAlertRead, markAllAlertsRead } from '@/services/alerts';
import { getSeverityColor, formatDateTime } from '@/utils/format';
import { Bell, CheckCheck, AlertTriangle, Info, AlertOctagon } from 'lucide-react';
import type { Alert } from '@/types';

export function AlertsPage() {
  const { facility, user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Alert | null>(null);
  const [filter, setFilter] = useState('all');

  const loadData = useCallback(async () => {
    if (!facility) return;
    try { setAlerts(await getAlerts(facility.id)); }
    catch { /* */ } finally { setLoading(false); }
  }, [facility]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMarkRead = async (id: string) => {
    if (!user) return;
    try { await markAlertRead(id, user.id); loadData(); showToast('Alert marked as read', 'success'); }
    catch { showToast('Failed', 'error'); }
  };

  const handleMarkAll = async () => {
    if (!facility || !user) return;
    try { await markAllAlertsRead(facility.id, user.id); loadData(); showToast('All alerts marked as read', 'success'); }
    catch { showToast('Failed', 'error'); }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const filtered = filter === 'all' ? alerts : filter === 'unread' ? alerts.filter((a) => !a.is_read) : alerts.filter((a) => a.severity.toLowerCase() === filter);
  const unreadCount = alerts.filter((a) => !a.is_read).length;
  const severityIcon = (sev: string) => sev === 'Critical' ? <AlertOctagon className="w-5 h-5 text-red-500" /> : sev === 'Warning' ? <AlertTriangle className="w-5 h-5 text-orange-500" /> : <Info className="w-5 h-5 text-blue-500" />;

  return (
    <ManagementLayout>
      <PageHeader title="Alerts" subtitle="System alerts and notifications"
        actions={unreadCount > 0 ? <button onClick={handleMarkAll} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition"><CheckCheck className="w-4 h-4" /> Mark All Read</button> : undefined} />

      <div className="flex flex-wrap gap-2 mb-4">
        {['all', 'unread', 'critical', 'warning', 'info'].map((f) => <button key={f} onClick={() => setFilter(f)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter === f ? 'bg-teal-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          {f.charAt(0).toUpperCase() + f.slice(1)} {f === 'unread' && unreadCount > 0 ? `(${unreadCount})` : ''}
        </button>)}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No alerts</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((alert) => {
            const sc = getSeverityColor(alert.severity);
            return (
              <div key={alert.id} className={`rounded-xl border p-4 ${sc.border} ${sc.bg} ${!alert.is_read ? 'ring-1 ring-teal-200' : ''}`}>
                <div className="flex items-start gap-3">
                  {severityIcon(alert.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{alert.title}</p>
                      <span className={`text-xs font-medium ${sc.text}`}>{alert.severity}</span>
                      {!alert.is_read && <span className="w-2 h-2 rounded-full bg-teal-500" />}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(alert.created_at)} — {alert.type}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setSelected(alert)} className="p-1.5 rounded hover:bg-white/50 text-gray-500 text-xs font-medium">Details</button>
                    {!alert.is_read && <button onClick={() => handleMarkRead(alert.id)} className="p-1.5 rounded hover:bg-white/50 text-teal-600 text-xs font-medium">Mark Read</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Alert Details" size="sm">
        {selected && (
          <div className="space-y-3">
            <div><span className="text-sm text-gray-500">Type:</span> <span className="text-sm text-gray-900">{selected.type}</span></div>
            <div><span className="text-sm text-gray-500">Severity:</span> <span className="text-sm text-gray-900">{selected.severity}</span></div>
            <div><span className="text-sm text-gray-500">Title:</span> <span className="text-sm text-gray-900">{selected.title}</span></div>
            <div><span className="text-sm text-gray-500 block mb-1">Message:</span><span className="text-sm text-gray-900">{selected.message}</span></div>
            <div><span className="text-sm text-gray-500">Created:</span> <span className="text-sm text-gray-900">{formatDateTime(selected.created_at)}</span></div>
            {selected.is_read && <div><span className="text-sm text-gray-500">Read at:</span> <span className="text-sm text-gray-900">{formatDateTime(selected.read_at || '')}</span></div>}
          </div>
        )}
      </Modal>
    </ManagementLayout>
  );
}
