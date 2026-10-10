import { supabase } from '@/lib/supabase';
import type { AIDetection, ManualReview, WasteCategory } from '@/types';

export async function getDetections(facilityId: string) {
  const { data, error } = await supabase
    .from('ai_detections')
    .select('*')
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as AIDetection[];
}

export async function getLowConfidenceDetections(facilityId: string) {
  const { data, error } = await supabase
    .from('ai_detections')
    .select('*')
    .eq('facility_id', facilityId)
    .eq('confidence_status', 'Low')
    .eq('review_status', 'Pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as AIDetection[];
}

export async function createDetection(data: {
  facility_id: string;
  image_url?: string;
  predicted_category: WasteCategory;
  confidence: number;
  recommended_bin: string;
  confidence_status: 'High' | 'Low';
  review_status?: string;
  is_demo: boolean;
  detected_by: string;
  waste_receiving_id?: string;
}) {
  const reviewStatus = data.confidence_status === 'High' ? 'Auto-Accepted' : 'Pending';
  const { data: result, error } = await supabase
    .from('ai_detections')
    .insert({
      ...data,
      review_status: reviewStatus,
    })
    .select()
    .single();
  if (error) throw error;

  await supabase.from('system_history').insert({
    facility_id: data.facility_id,
    category: 'AI Sorting',
    action: 'AI detection performed',
    entity_type: 'ai_detections',
    entity_id: result.id,
    description: `Predicted ${data.predicted_category} with ${data.confidence}% confidence (Bin: ${data.recommended_bin})`,
    performed_by: data.detected_by,
  });

  return result as AIDetection;
}

export async function createManualReview(data: {
  facility_id: string;
  ai_detection_id: string;
  original_category: string;
  original_confidence: number;
  corrected_category: WasteCategory | null;
  review_action: 'Confirmed' | 'Changed' | 'Rejected';
  operator_id: string;
  operator_name: string;
  review_notes?: string;
}) {
  // Check for existing review for this detection (prevent duplicates)
  const { data: existing } = await supabase
    .from('manual_reviews')
    .select('*')
    .eq('ai_detection_id', data.ai_detection_id)
    .maybeSingle();

  let result: ManualReview;

  if (existing) {
    // Update the existing review instead of creating a new one
    const { data: updated, error: updateError } = await supabase
      .from('manual_reviews')
      .update({
        corrected_category: data.corrected_category,
        review_action: data.review_action,
        operator_id: data.operator_id,
        operator_name: data.operator_name,
        review_notes: data.review_notes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (updateError) throw updateError;
    result = updated as ManualReview;
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from('manual_reviews')
      .insert(data)
      .select()
      .single();
    if (insertError) throw insertError;
    result = inserted as ManualReview;
  }

  // Update the AI detection's review status
  let newReviewStatus: string;
  if (data.review_action === 'Confirmed') newReviewStatus = 'Confirmed';
  else if (data.review_action === 'Changed') newReviewStatus = 'Changed';
  else newReviewStatus = 'Rejected';

  await supabase
    .from('ai_detections')
    .update({ review_status: newReviewStatus })
    .eq('id', data.ai_detection_id);

  await supabase.from('system_history').insert({
    facility_id: data.facility_id,
    category: 'Manual Review',
    action: `Review: ${data.review_action}`,
    entity_type: 'ai_detections',
    entity_id: data.ai_detection_id,
    description: `Original: ${data.original_category} (${data.original_confidence}%) → ${data.review_action === 'Changed' ? data.corrected_category : data.review_action}`,
    performed_by: data.operator_id,
    performed_by_name: data.operator_name,
  });

  return result;
}

export async function getManualReviews(facilityId: string) {
  const { data, error } = await supabase
    .from('manual_reviews')
    .select('*, ai_detections!manual_reviews_ai_detection_id_fkey(*)')
    .eq('facility_id', facilityId)
    .order('reviewed_at', { ascending: false });
  if (error) throw error;
  return data;
}
