export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function formatKg(value: number): string {
  return `${formatNumber(value)} kg`;
}

export function formatCurrency(value: number): string {
  return `₹${formatNumber(value)}`;
}

export function formatPercentage(value: number): string {
  return `${formatNumber(value, 1)}%`;
}

export function getBinColorClass(binColor: string): string {
  const map: Record<string, string> = {
    'Blue': 'bg-blue-500',
    'Green': 'bg-green-500',
    'Black/Grey': 'bg-gray-600',
    'Yellow': 'bg-yellow-400',
    'Orange': 'bg-orange-500',
  };
  return map[binColor] || 'bg-gray-400';
}

export function getBinTextColorClass(binColor: string): string {
  const map: Record<string, string> = {
    'Blue': 'text-blue-600',
    'Green': 'text-green-600',
    'Black/Grey': 'text-gray-700',
    'Yellow': 'text-yellow-600',
    'Orange': 'text-orange-600',
  };
  return map[binColor] || 'text-gray-600';
}

export function getBinBorderColorClass(binColor: string): string {
  const map: Record<string, string> = {
    'Blue': 'border-blue-500',
    'Green': 'border-green-500',
    'Black/Grey': 'border-gray-600',
    'Yellow': 'border-yellow-400',
    'Orange': 'border-orange-500',
  };
  return map[binColor] || 'border-gray-400';
}

export function getCategoryColor(category: string): { bg: string; text: string; border: string } {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    'Plastic': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    'Organic': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    'Metal': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
    'Fabric': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    'E-Waste': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  };
  return map[category] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
}

export function getStatusColor(status: string): { bg: string; text: string } {
  const lower = status.toLowerCase();
  if (lower.includes('completed') || lower.includes('fulfilled') || lower.includes('dispatched') || lower === 'auto-accepted' || lower === 'confirmed') {
    return { bg: 'bg-green-100', text: 'text-green-700' };
  }
  if (lower.includes('pending') || lower.includes('collecting') || lower === 'requested' || lower === 'ready') {
    return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
  }
  if (lower.includes('assigned') || lower.includes('scheduled') || lower.includes('progress')) {
    return { bg: 'bg-blue-100', text: 'text-blue-700' };
  }
  if (lower.includes('cancelled') || lower.includes('rejected') || lower.includes('full') || lower === 'critical' || lower === 'low') {
    return { bg: 'bg-red-100', text: 'text-red-700' };
  }
  if (lower.includes('collected') || lower.includes('normal') || lower === 'high' || lower === 'info') {
    return { bg: 'bg-blue-50', text: 'text-blue-600' };
  }
  if (lower.includes('warning') || lower.includes('nearly') || lower === 'changed') {
    return { bg: 'bg-orange-100', text: 'text-orange-700' };
  }
  return { bg: 'bg-gray-100', text: 'text-gray-700' };
}

export function getSeverityColor(severity: string): { bg: string; text: string; border: string } {
  if (severity === 'Critical') return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
  if (severity === 'Warning') return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
  return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
