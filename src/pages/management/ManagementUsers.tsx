import { useEffect, useState, useCallback } from 'react';
import { ManagementLayout } from '@/layouts/ManagementLayout';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Modal } from '@/components/Modal';
import { showToast } from '@/components/Toast';
import { useAuth } from '@/hooks/useAuth';
import { getManagementUsers, toggleManagementUserActive, deleteManagementUser, createManagementUserViaEdge, getFacilities } from '@/services/management';
import { formatDate } from '@/utils/format';
import { PlusCircle, UserCheck, UserX, Trash2 } from 'lucide-react';
import type { ManagementUserWithProfile, ManagementRole, Facility } from '@/types';

export function ManagementUsersPage() {
  const { managementUser, profile, facility } = useAuth();
  const [users, setUsers] = useState<ManagementUserWithProfile[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'operator' as ManagementRole, facility_id: '', job_title: '' });
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    if (!managementUser) return;
    try {
      const [us, facs] = await Promise.all([getManagementUsers(managementUser.company_id), getFacilities(managementUser.company_id)]);
      setUsers(us); setFacilities(facs);
    } catch { /* */ } finally { setLoading(false); }
  }, [managementUser]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggle = async (id: string, isActive: boolean) => {
    try { await toggleManagementUserActive(id, !isActive); showToast(isActive ? 'User deactivated' : 'User activated', 'success'); loadData(); }
    catch { showToast('Failed', 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Revoke management access for this user? This cannot be undone.')) return;
    try { await deleteManagementUser(id); showToast('Management access revoked', 'success'); loadData(); }
    catch { showToast('Failed', 'error'); }
  };

  const handleCreate = async () => {
    if (!managementUser || !profile) return;
    if (!form.email || !form.password || !form.full_name) { showToast('All fields required', 'error'); return; }
    setCreating(true);
    try {
      await createManagementUserViaEdge({
        email: form.email, password: form.password, full_name: form.full_name, role: form.role,
        company_id: managementUser.company_id, facility_id: form.facility_id || managementUser.facility_id || '',
        job_title: form.job_title,
      });
      showToast('Management user created successfully', 'success');
      setShowModal(false);
      setForm({ email: '', password: '', full_name: '', role: 'operator', facility_id: '', job_title: '' });
      loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create user', 'error');
    } finally { setCreating(false); }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const roles: ManagementRole[] = ['admin', 'manager', 'operator'];

  return (
    <ManagementLayout>
      <PageHeader title="Management Users" subtitle="Manage company management team members"
        actions={<button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition"><PlusCircle className="w-4 h-4" /> Create User</button>} />

      <DataTable
        columns={[
          { key: 'name', header: 'Name', render: (r) => r.profiles?.full_name || 'N/A' },
          { key: 'email', header: 'Email', render: (r) => r.profiles?.email || 'N/A' },
          { key: 'role', header: 'Role', render: (r) => <StatusBadge status={r.role} /> },
          { key: 'job_title', header: 'Job Title', render: (r) => r.job_title || '—' },
          { key: 'facility', header: 'Facility', render: (r) => r.facilities?.name || '—' },
          { key: 'is_active', header: 'Status', render: (r) => <StatusBadge status={r.is_active ? 'Active' : 'Inactive'} /> },
          { key: 'created_at', header: 'Created', render: (r) => formatDate(r.created_at) },
          { key: 'actions', header: 'Actions', render: (r) => (
            <div className="flex items-center gap-1">
              <button onClick={() => handleToggle(r.id, r.is_active)} className={`p-1.5 rounded ${r.is_active ? 'hover:bg-orange-50 text-orange-600' : 'hover:bg-green-50 text-green-600'}`} title={r.is_active ? 'Deactivate' : 'Activate'}>
                {r.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              </button>
              <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Revoke Access"><Trash2 className="w-4 h-4" /></button>
            </div>
          ) },
        ]}
        data={users}
        emptyMessage="No management users"
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Management User" size="md">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Jane Doe" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="jane@greencycle.com" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="••••••••" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Role</label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as ManagementRole })} className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none">{roles.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Facility</label><select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none"><option value="">Default</option>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Job Title (Optional)</label><input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Operations Manager" /></div>
          <button onClick={handleCreate} disabled={creating} className="w-full py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 transition">{creating ? 'Creating...' : 'Create User'}</button>
        </div>
      </Modal>
    </ManagementLayout>
  );
}
