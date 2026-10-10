import { useEffect, useState, useCallback, useRef } from 'react';
import { ManagementLayout } from '@/layouts/ManagementLayout';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { showToast } from '@/components/Toast';
import { useAuth } from '@/hooks/useAuth';
import { getDetections, createDetection } from '@/services/aiDetection';
import { predictWasteFromImage, getConfidenceStatus, getBinColor } from '@/services/wastePrediction';
import { processWaste } from '@/services/inventory';
import { createAlert } from '@/services/alerts';
import { getSystemSettings } from '@/services/management';
import { formatDate, formatDateTime, formatPercentage, getCategoryColor } from '@/utils/format';
import { Upload, ScanLine, CheckCircle, AlertTriangle, ImageIcon } from 'lucide-react';
import type { AIDetection, WasteCategory } from '@/types';

export function AIDetectionPage() {
  const { facility, user } = useAuth();
  const [detections, setDetections] = useState<AIDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [prediction, setPrediction] = useState<{ category: WasteCategory; confidence: number; recommendedBin: string; imageUrl: string } | null>(null);
  const [threshold, setThreshold] = useState(70);
  const [filter, setFilter] = useState('all');
  const fileRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    if (!facility) return;
    try {
      const [dets, settings] = await Promise.all([getDetections(facility.id), getSystemSettings(facility.id)]);
      setDetections(dets);
      if (settings) setThreshold(settings.ai_confidence_threshold);
    } catch { /* */ } finally { setLoading(false); }
  }, [facility]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !facility || !user) return;
    setAnalyzing(true);
    setPrediction(null);
    try {
      const result = await predictWasteFromImage(file, threshold);
      setPrediction(result);
      const confStatus = getConfidenceStatus(result.confidence, threshold);
      const reviewStatus = confStatus === 'High' ? 'Auto-Accepted' : 'Pending';

      const det = await createDetection({
        facility_id: facility.id,
        image_url: result.imageUrl,
        predicted_category: result.category,
        confidence: result.confidence,
        recommended_bin: result.recommendedBin,
        confidence_status: confStatus,
        review_status: reviewStatus,
        is_demo: false,
        detected_by: user.id,
      });

      if (confStatus === 'High') {
        await processWaste(facility.id, result.category, 1, user.id);
        showToast(`High confidence: ${result.category} (${result.confidence}%). Auto-accepted and processed.`, 'success');
      } else {
        await createAlert({
          facility_id: facility.id,
          type: 'Low AI Confidence',
          severity: 'Warning',
          title: 'Low Confidence Detection',
          message: `${result.category} predicted at ${result.confidence}% confidence. Manual review required.`,
          related_id: det.id,
          related_table: 'ai_detections',
        });
        showToast(`Low confidence (${result.confidence}%). Sent to Manual Review.`, 'info');
      }
      loadData();
    } catch {
      showToast('Analysis failed', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const filtered = filter === 'all' ? detections : filter === 'High' ? detections.filter((d) => d.confidence_status === 'High') : filter === 'Low' ? detections.filter((d) => d.confidence_status === 'Low') : detections.filter((d) => d.review_status === filter);
  const filters = ['all', 'High', 'Low', 'Auto-Accepted', 'Pending', 'Confirmed', 'Changed', 'Rejected'];

  if (loading) return <LoadingSpinner fullScreen />;

  const catColor = prediction ? getCategoryColor(prediction.category) : null;

  return (
    <ManagementLayout>
      <PageHeader title="AI Waste Detection" subtitle="Upload waste images for AI-powered classification" />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-teal-400 transition cursor-pointer" onClick={() => fileRef.current?.click()}>
          {analyzing ? (
            <div className="text-center">
              <ScanLine className="w-12 h-12 text-teal-500 animate-pulse mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">Analyzing image...</p>
              <p className="text-xs text-gray-400 mt-1">Analyzing visual content</p>
            </div>
          ) : prediction ? (
            <div className="w-full">
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                <div className="w-32 h-32 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                  <img src={prediction.imageUrl} alt="Uploaded waste" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 space-y-3 w-full">
                  <div className={`p-3 rounded-lg ${catColor?.bg} ${catColor?.border} border`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-lg font-bold ${catColor?.text}`}>{prediction.category}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${prediction.confidence >= threshold ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {prediction.confidence >= threshold ? 'High Confidence' : 'Low Confidence'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">Confidence:</span> <span className="font-medium">{formatPercentage(prediction.confidence)}</span></div>
                    <div><span className="text-gray-500">Bin:</span> <span className="font-medium">{prediction.recommendedBin}</span></div>
                  </div>
                  {prediction.confidence >= threshold ? (
                    <div className="flex items-center gap-2 text-sm text-green-600"><CheckCircle className="w-4 h-4" /> Auto-accepted and processed</div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-orange-600"><AlertTriangle className="w-4 h-4" /> Sent to Manual Review</div>
                  )}
                </div>
              </div>
              <button onClick={() => fileRef.current?.click()} className="mt-4 w-full py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition">Analyze Another Image</button>
            </div>
          ) : (
            <div className="text-center">
              <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">Click to upload waste image</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG up to 10MB</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">Threshold: {threshold}%</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter === f ? 'bg-teal-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      <DataTable
        columns={[
          { key: 'image', header: 'Image', render: (r) => r.image_url ? <img src={r.image_url} alt="" className="w-10 h-10 rounded object-cover" /> : <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-gray-400" /></div> },
          { key: 'detected_at', header: 'Date/Time', render: (r) => formatDateTime(r.detected_at) },
          { key: 'predicted_category', header: 'Category', render: (r) => <span className="font-medium">{r.predicted_category}</span> },
          { key: 'confidence', header: 'Confidence', render: (r) => <span className={r.confidence >= threshold ? 'text-green-600' : 'text-orange-600'}>{formatPercentage(r.confidence)}</span> },
          { key: 'recommended_bin', header: 'Bin' },
          { key: 'confidence_status', header: 'Conf. Status', render: (r) => <StatusBadge status={r.confidence_status} /> },
          { key: 'review_status', header: 'Review', render: (r) => <StatusBadge status={r.review_status} /> },
        ]}
        data={filtered}
        emptyMessage="No AI detections yet"
      />
    </ManagementLayout>
  );
}
