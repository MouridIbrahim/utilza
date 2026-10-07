import { useToastStore } from '../../components/feedback/ToastRegion.jsx';

export async function copyText(text, okMessage = 'Copied.') {
  const toast = useToastStore.getState().push;
  try {
    await navigator.clipboard.writeText(text);
    toast({ tone: 'success', message: okMessage });
    return true;
  } catch {
    toast({ tone: 'error', message: 'Copy failed.' });
    return false;
  }
}

export function formatNumber(n, maxDigits = 4) {
  if (!Number.isFinite(n)) return '—';
  const rounded = Number(n.toFixed(maxDigits));
  return rounded.toLocaleString('en-US', { maximumFractionDigits: maxDigits });
}
