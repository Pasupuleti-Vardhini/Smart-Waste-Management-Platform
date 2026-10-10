import { useEffect, useState, useCallback } from 'react';
import { ManagementLayout } from '@/layouts/ManagementLayout';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Modal } from '@/components/Modal';
import { showToast } from '@/components/Toast';
import { useAuth } from '@/hooks/useAuth';
import { getLowConfidenceDetections, createManualReview, getManualReviews } from '@/services/aiDetection';
import { processWaste } from '@/services/inventory';
import { supabase } from '@/lib/supabase';
import { formatDate, formatPercentage, getCategoryColor } from '@/utils/format';
import { CheckCircle, Edit3, XCircle, ClipboardCheck } from 'lucide-react';
import type { AIDetection, WasteCategory, ManualReview } from '@/types';

interface ReviewWithDetection extends ManualReview {
  ai_detections?: AIDetection;
}

export function ManualReviewPage() {
  const { facility, user, profile } = useAuth();
  const [pending, setPending] = useState<AIDetection[]>([]);
  const [reviews, setReviews] = useState<ReviewWithDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState<AIDetection | null>(null);
  const [action, setAction] = useState<'Confirmed' | 'Changed' | 'Rejected'>('Confirmed');
  const [correctedCat, setCorrectedCat] = useState<WasteCategory>('Plastic');
  const [reviewNotes, setReviewNotes] = useState('');
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!facility) return;
    try {
      const [low, revs] = await Promise.all([getLowConfidenceDetections(facility.id), getManualReviews(facility.id)]);
      setPending(low);
      setReviews(revs as ReviewWithDetection[]);
    } catch { /* */ } finally { setLoading(false); }
  }, [facility]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleReview = async () => {
    if (!reviewModal || !facility || !user || !profile || saving) return;
    setSaving(true);
    try {
      const finalCat = action === 'Changed' ? correctedCat : reviewModal.predicted_category;

      // Check if this detection already has a review (and thus may have already been processed)
      const { data: existingReview } = await supabase
        .from('manual_reviews')
        .select('id, review_action')
        .eq('ai_detection_id', reviewModal.id)
        .maybeSingle();

      const wasPreviouslyApproved = existingReview && existingReview.review_action !== 'Rejected';

      await createManualReview({
        facility_id: facility.id,
        ai_detection_id: reviewModal.id,
        original_category: reviewModal.predicted_category,
        original_confidence: reviewModal.confidence,
        corrected_category: action === 'Changed' ? correctedCat : null,
        review_action: action,
        operator_id: user.id,
        operator_name: profile.full_name,
        review_notes: reviewNotes || undefined,
      });

      // Only process waste if:
      // 1. The review is not Rejected
      // 2. The waste was not previously approved (avoid double-processing on re-review)
      if (action !== 'Rejected' && !wasPreviouslyApproved) {
        await processWaste(facility.id, finalCat, 1, user.id);
      }

      if (action === 'Rejected') {
        showToast('Detection rejected. Waste will not enter storage.', 'info');
      } else if (wasPreviouslyApproved) {
        showToast(`Review updated to ${action === 'Changed' ? correctedCat : 'Confirmed'}.`, 'success');
      } else {
        showToast(`${action === 'Changed' ? 'Category changed to ' + correctedCat : 'Confirmed'} and processed.`, 'success');
      }

      setReviewModal(null);
      setAction('Confirmed');
      setReviewNotes('');
      loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to submit review', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const categories: WasteCategory[] = ['Plastic', 'Organic', 'Metal', 'Fabric', 'E-Waste'];

  return (
    <ManagementLayout>
      <PageHeader title="Manual Review" subtitle="Review low-confidence AI detections" />

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('pending')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'pending' ? 'bg-teal-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          Pending ({pending.length})
        </button>
        <button onClick={() => setTab('history')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'history' ? 'bg-teal-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          Review History ({reviews.length})
        </button>
      </div>

      {tab === 'pending' ? (
        pending.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
            <p className="text-gray-500">No pending reviews. All caught up!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pending.map((det) => {
              const cc = getCategoryColor(det.predicted_category);
              return (
                <div key={det.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-start gap-4">
                    {det.image_url && <img src={det.image_url} alt="" className="w-16 h-16 rounded-lg object-cover" />}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded-lg text-sm font-medium ${cc.bg} ${cc.text}`}>{det.predicted_category}</span>
                        <span className="text-sm text-orange-600 font-medium">{formatPercentage(det.confidence)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Bin: {det.recommended_bin} | {formatDate(det.detected_at)}</p>
                      <button onClick={() => { setReviewModal(det); setAction('Confirmed'); }} className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-600 text-sm font-medium hover:bg-teal-100 transition">
                        <ClipboardCheck className="w-4 h-4" /> Review
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <DataTable
          columns={[
            { key: 'reviewed_at', header: 'Date', render: (r) => formatDate(r.reviewed_at) },
            { key: 'original_category', header: 'Original' },
            { key: 'original_confidence', header: 'Confidence', render: (r) => formatPercentage(r.original_confidence) },
            { key: 'review_action', header: 'Action', render: (r) => <StatusBadge status={r.review_action} /> },
            { key: 'corrected_category', header: 'Corrected To', render: (r) => r.corrected_category || '—' },
            { key: 'operator_name', header: 'Operator' },
            { key: 'review_notes', header: 'Notes', render: (r) => r.review_notes || '—' },
          ]}
          data={reviews}
          emptyMessage="No review history"
        />
      )}

      <Modal isOpen={!!reviewModal} onClose={() => setReviewModal(null)} title="Manual Review" size="md">
        {reviewModal && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-gray-50 space-y-1 text-sm">
              <p><span className="text-gray-500">Original Category:</span> <span className="font-medium">{reviewModal.predicted_category}</span></p>
              <p><span className="text-gray-500">Confidence:</span> <span className="font-medium text-orange-600">{formatPercentage(reviewModal.confidence)}</span></p>
              <p><span className="text-gray-500">Recommended Bin:</span> <span className="font-medium">{reviewModal.recommended_bin}</span></p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Review Action</label>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setAction('Confirmed')} className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition ${action === 'Confirmed' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <CheckCircle className="w-5 h-5 text-green-600" /><span className="text-xs font-medium">Confirm</span>
                </button>
                <button onClick={() => setAction('Changed')} className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition ${action === 'Changed' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <Edit3 className="w-5 h-5 text-blue-600" /><span className="text-xs font-medium">Change</span>
                </button>
                <button onClick={() => setAction('Rejected')} className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition ${action === 'Rejected' ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
                  <XCircle className="w-5 h-5 text-red-600" /><span className="text-xs font-medium">Reject</span>
                </button>
              </div>
            </div>
            {action === 'Changed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Correct Category</label>
                <select value={correctedCat} onChange={(e) => setCorrectedCat(e.target.value as WasteCategory)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none">
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (Optional)</label>
              <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={2}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none resize-none" placeholder="Review notes..." />
            </div>
            <button onClick={handleReview} disabled={saving} className="w-full py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2">
              {saving ? (<><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>) : 'Submit Review'}
            </button>
          </div>
        )}
      </Modal>
    </ManagementLayout>
  );
}
