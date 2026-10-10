import { useEffect, useState, useCallback } from 'react';
import { ManagementLayout } from '@/layouts/ManagementLayout';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { showToast } from '@/components/Toast';
import { useAuth } from '@/hooks/useAuth';
import { getSystemSettings, updateSystemSettings, getRewardRates, updateRewardRate } from '@/services/management';
import { updatePassword } from '@/services/auth';
import { formatDate } from '@/utils/format';
import { Building, Sliders, Lock, Save } from 'lucide-react';
import type { SystemSettings, RewardRate } from '@/types';

export function SettingsPage() {
  const { facility, profile } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [rates, setRates] = useState<RewardRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!facility) return;
    try {
      const [s, r] = await Promise.all([getSystemSettings(facility.id), getRewardRates(facility.id)]);
      setSettings(s); setRates(r);
    } catch { /* */ } finally { setLoading(false); }
  }, [facility]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveSettings = async () => {
    if (!facility || !settings) return;
    setSaving(true);
    try {
      await updateSystemSettings(facility.id, {
        ai_confidence_threshold: settings.ai_confidence_threshold,
        bin_capacity_plastic: settings.bin_capacity_plastic,
        bin_capacity_organic: settings.bin_capacity_organic,
        bin_capacity_metal: settings.bin_capacity_metal,
        bin_capacity_fabric: settings.bin_capacity_fabric,
        bin_capacity_ewaste: settings.bin_capacity_ewaste,
        storage_capacity_plastic: settings.storage_capacity_plastic,
        storage_capacity_organic: settings.storage_capacity_organic,
        storage_capacity_metal: settings.storage_capacity_metal,
        storage_capacity_fabric: settings.storage_capacity_fabric,
        storage_capacity_ewaste: settings.storage_capacity_ewaste,
        unit_preference: settings.unit_preference,
        demo_mode: settings.demo_mode,
        demo_iot: settings.demo_iot,
        demo_ai: settings.demo_ai,
      });
      showToast('Settings saved successfully', 'success');
    } catch { showToast('Failed to save settings', 'error'); }
    finally { setSaving(false); }
  };

  const handleRateChange = async (id: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    try { await updateRewardRate(id, num); showToast('Reward rate updated', 'success'); loadData(); }
    catch { showToast('Failed to update rate', 'error'); }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.password !== pwForm.confirm) { showToast('Passwords do not match', 'error'); return; }
    if (pwForm.password.length < 6) { showToast('Password too short', 'error'); return; }
    setPwLoading(true);
    try { await updatePassword(pwForm.password); setPwForm({ password: '', confirm: '' }); showToast('Password updated', 'success'); }
    catch { showToast('Failed to update password', 'error'); }
    finally { setPwLoading(false); }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none text-sm';

  return (
    <ManagementLayout>
      <PageHeader title="Settings" subtitle="Manage system configuration and preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4"><Building className="w-5 h-5 text-teal-600" /><h3 className="font-semibold text-gray-900">Facility & Profile</h3></div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium">{profile?.full_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium">{profile?.email}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Facility</span><span className="font-medium">{facility?.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">State</span><span className="font-medium">{facility?.state || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">District</span><span className="font-medium">{facility?.district || 'N/A'}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4"><Lock className="w-5 h-5 text-teal-600" /><h3 className="font-semibold text-gray-900">Security</h3></div>
          <form onSubmit={handlePassword} className="space-y-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">New Password</label><input type="password" value={pwForm.password} onChange={(e) => setPwForm({ ...pwForm, password: e.target.value })} required className={inputCls} placeholder="••••••••" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label><input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} required className={inputCls} placeholder="••••••••" /></div>
            <button type="submit" disabled={pwLoading} className="w-full py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-900 disabled:opacity-50 transition">{pwLoading ? 'Updating...' : 'Update Password'}</button>
          </form>
        </div>

        {settings && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4"><Sliders className="w-5 h-5 text-teal-600" /><h3 className="font-semibold text-gray-900">System Settings</h3></div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">AI Confidence Threshold (%)</label><input type="number" value={settings.ai_confidence_threshold} onChange={(e) => setSettings({ ...settings, ai_confidence_threshold: parseFloat(e.target.value) })} min="0" max="100" className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-gray-500 mb-1">Bin: Plastic (kg)</label><input type="number" value={settings.bin_capacity_plastic} onChange={(e) => setSettings({ ...settings, bin_capacity_plastic: parseFloat(e.target.value) })} className={inputCls} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Bin: Organic (kg)</label><input type="number" value={settings.bin_capacity_organic} onChange={(e) => setSettings({ ...settings, bin_capacity_organic: parseFloat(e.target.value) })} className={inputCls} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Bin: Metal (kg)</label><input type="number" value={settings.bin_capacity_metal} onChange={(e) => setSettings({ ...settings, bin_capacity_metal: parseFloat(e.target.value) })} className={inputCls} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Bin: Fabric (kg)</label><input type="number" value={settings.bin_capacity_fabric} onChange={(e) => setSettings({ ...settings, bin_capacity_fabric: parseFloat(e.target.value) })} className={inputCls} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Bin: E-Waste (kg)</label><input type="number" value={settings.bin_capacity_ewaste} onChange={(e) => setSettings({ ...settings, bin_capacity_ewaste: parseFloat(e.target.value) })} className={inputCls} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Unit</label><select value={settings.unit_preference} onChange={(e) => setSettings({ ...settings, unit_preference: e.target.value })} className={inputCls}><option>kg</option><option>g</option><option>ton</option></select></div>
              </div>
              <button onClick={handleSaveSettings} disabled={saving} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition"><Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Reward Rates</h3>
          <div className="space-y-3">
            {rates.map((r) => (
              <div key={r.id} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{r.waste_type}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">₹</span>
                  <input type="number" defaultValue={r.rate_per_kg} onBlur={(e) => handleRateChange(r.id, e.target.value)} min="0" step="0.5" className="w-20 px-2 py-1.5 rounded border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none text-sm" />
                  <span className="text-xs text-gray-400">/kg</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Category-to-Bin Mapping</h3>
          <div className="space-y-2 text-sm">
            {['Plastic → Blue', 'Organic → Green', 'Metal → Black/Grey', 'Fabric → Yellow', 'E-Waste → Orange'].map((m) => (
              <div key={m} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                <span className="font-medium text-gray-700">{m.split(' → ')[0]}</span>
                <span className="text-gray-500">→ {m.split(' → ')[1]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ManagementLayout>
  );
}
