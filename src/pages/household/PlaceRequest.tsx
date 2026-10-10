import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplets, Trash2, Calendar, Clock, MapPin, StickyNote, Send } from 'lucide-react';
import { HouseholdLayout } from '@/layouts/HouseholdLayout';
import { PageHeader } from '@/components/PageHeader';
import { createCollectionRequest } from '@/services/collection';
import { showToast } from '@/components/Toast';
import { useAuth } from '@/hooks/useAuth';
import type { WasteType } from '@/types';

export function PlaceRequestPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    waste_type: 'Dry Waste' as WasteType,
    estimated_quantity_kg: '',
    preferred_pickup_date: '',
    preferred_pickup_time: '09:00',
    pickup_address: profile?.address || '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(form.estimated_quantity_kg);
    if (!qty || qty <= 0) {
      showToast('Please enter a valid quantity greater than 0', 'error');
      return;
    }
    setLoading(true);
    try {
      await createCollectionRequest({
        waste_type: form.waste_type,
        estimated_quantity_kg: qty,
        preferred_pickup_date: form.preferred_pickup_date,
        preferred_pickup_time: form.preferred_pickup_time,
        pickup_address: form.pickup_address,
        notes: form.notes || undefined,
      });
      showToast('Collection request submitted successfully!', 'success');
      navigate('/household/requests');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit request';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition';
  const today = new Date().toISOString().split('T')[0];

  return (
    <HouseholdLayout>
      <PageHeader title="Place Collection Request" subtitle="Schedule a waste pickup at your convenience" />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Waste Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, waste_type: 'Wet Waste' })}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition ${
                  form.waste_type === 'Wet Waste' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Droplets className={`w-6 h-6 ${form.waste_type === 'Wet Waste' ? 'text-teal-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Wet Waste</p>
                  <p className="text-xs text-gray-500">Food, organic waste</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, waste_type: 'Dry Waste' })}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition ${
                  form.waste_type === 'Dry Waste' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Trash2 className={`w-6 h-6 ${form.waste_type === 'Dry Waste' ? 'text-teal-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Dry Waste</p>
                  <p className="text-xs text-gray-500">Plastic, metal, paper</p>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimated Quantity (kg)</label>
            <input
              type="number"
              name="estimated_quantity_kg"
              value={form.estimated_quantity_kg}
              onChange={handleChange}
              required
              min="0.1"
              step="0.1"
              className={inputClass}
              placeholder="e.g. 10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred Pickup Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="date" name="preferred_pickup_date" value={form.preferred_pickup_date} onChange={handleChange} required min={today} className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred Pickup Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="time" name="preferred_pickup_time" value={form.preferred_pickup_time} onChange={handleChange} className={inputClass} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Pickup Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <textarea name="pickup_address" value={form.pickup_address} onChange={handleChange} required rows={2} className={`${inputClass} resize-none`} placeholder="Your address" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (Optional)</label>
            <div className="relative">
              <StickyNote className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className={`${inputClass} resize-none`} placeholder="Any special instructions for the collector..." />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 transition">
            <Send className="w-5 h-5" />
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </HouseholdLayout>
  );
}
