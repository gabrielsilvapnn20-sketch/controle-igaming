// Formatação pt-BR: moeda em R$, datas dd/mm/aaaa, números e percentuais.

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatBRL(v) {
  if (v == null || Number.isNaN(Number(v))) return 'R$ 0,00';
  return brl.format(Number(v));
}

export function formatBRLCompact(v) {
  if (v == null || Number.isNaN(Number(v))) return 'R$ 0';
  return brlCompact.format(Number(v));
}

export function formatNumero(v) {
  if (v == null || Number.isNaN(Number(v))) return '0';
  return new Intl.NumberFormat('pt-BR').format(Number(v));
}

export function formatPercent(v, casas = 1) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: casas }).format(Number(v))}%`;
}

// Data ISO (YYYY-MM-DD ou completa) -> dd/mm/aaaa
export function formatData(iso) {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDataCurta(iso) {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// Hoje em ISO (YYYY-MM-DD) no fuso local.
export function hojeISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function addDiasISO(iso, dias) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + dias);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function inicioDoMesISO() {
  const d = new Date();
  return hojeISO().slice(0, 8) + '01';
}
