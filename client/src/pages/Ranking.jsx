import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Crown, Award } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge, ModeloBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared';
import { api } from '@/lib/api';
import { formatBRL, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

const CRITERIOS = [
  { v: 'lucro', label: 'Lucro total', get: (i) => i.metricas.lucro, fmt: formatBRL, desc: true },
  { v: 'roi', label: 'ROI', get: (i) => i.metricas.roi, fmt: formatPercent, desc: true },
  {
    v: 'custoCadastro',
    label: 'Menor custo por cadastro',
    get: (i) => i.metricas.custoPorCadastro,
    fmt: (v) => (v != null ? formatBRL(v) : '—'),
    desc: false,
  },
  {
    v: 'custoStory',
    label: 'Menor custo por story',
    get: (i) => i.metricas.custoMedioPorStory,
    fmt: (v) => (v != null ? formatBRL(v) : '—'),
    desc: false,
    soStories: true,
  },
];

const PODIO = [
  { icon: Crown, ring: 'ring-yellow-400/60', bg: 'from-yellow-500/20', text: 'text-yellow-400', label: '1º' },
  { icon: Medal, ring: 'ring-slate-300/50', bg: 'from-slate-400/20', text: 'text-slate-300', label: '2º' },
  { icon: Award, ring: 'ring-amber-600/50', bg: 'from-amber-700/20', text: 'text-amber-500', label: '3º' },
];

export default function Ranking() {
  const [lista, setLista] = useState(null);
  const [criterioId, setCriterioId] = useState('lucro');

  useEffect(() => {
    api.getRanking().then(setLista);
  }, []);

  const criterio = CRITERIOS.find((c) => c.v === criterioId);

  const ordenada = useMemo(() => {
    if (!lista) return [];
    let base = lista;
    if (criterio.soStories) base = base.filter((i) => i.modeloPagamento === 'stories');
    // valores nulos vão para o fim.
    return [...base].sort((a, b) => {
      const va = criterio.get(a);
      const vb = criterio.get(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return criterio.desc ? vb - va : va - vb;
    });
  }, [lista, criterio]);

  const top3 = ordenada.slice(0, 3);
  const resto = ordenada.slice(3);

  return (
    <div>
      <PageHeader title="Ranking" subtitle="Compare o desempenho das parcerias por diferentes critérios">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card/60 p-1">
          {CRITERIOS.map((c) => (
            <button
              key={c.v}
              onClick={() => setCriterioId(c.v)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                criterioId === c.v
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </PageHeader>

      {!lista ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : ordenada.length === 0 ? (
        <Card>
          <EmptyState
            icon={Trophy}
            title="Sem dados para o ranking"
            description="Registre lançamentos para que os influenciadores apareçam aqui."
          />
        </Card>
      ) : (
        <>
          {/* Pódio */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {top3.map((i, idx) => {
              const p = PODIO[idx];
              const Icon = p.icon;
              const negativo = criterioId === 'lucro' && i.metricas.lucro < 0;
              return (
                <Link key={i.id} to={`/influenciadores/${i.id}`}>
                  <Card
                    className={cn(
                      'relative overflow-hidden p-6 text-center ring-1 transition-transform hover:-translate-y-1',
                      p.ring,
                      idx === 0 && 'sm:-translate-y-3',
                    )}
                  >
                    <div className={cn('absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent', p.bg)} />
                    <div className="relative">
                      <div className={cn('mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-background/60', p.text)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <p className={cn('mt-2 text-xs font-bold', p.text)}>{p.label} lugar</p>
                      <p className="mt-2 truncate text-lg font-bold">{i.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{i.instagram || 'sem @'}</p>
                      <p
                        className={cn(
                          'mt-3 text-2xl font-bold tabular-nums',
                          criterioId === 'lucro' ? (negativo ? 'text-danger' : 'text-success') : 'text-foreground',
                        )}
                      >
                        {criterio.fmt(criterio.get(i))}
                      </p>
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <ModeloBadge modelo={i.modeloPagamento} />
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Restante */}
          {resto.length > 0 && (
            <Card className="mt-6 overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-5 py-3 font-medium">#</th>
                        <th className="px-4 py-3 font-medium">Influenciador</th>
                        <th className="px-4 py-3 font-medium">Modelo</th>
                        <th className="px-4 py-3 text-right font-medium">Lucro</th>
                        <th className="px-4 py-3 text-right font-medium">ROI</th>
                        <th className="px-4 py-3 text-right font-medium">{criterio.label}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resto.map((i, idx) => (
                        <tr key={i.id} className="border-b border-border/60 transition-colors hover:bg-secondary/30">
                          <td className="px-5 py-3 font-semibold text-muted-foreground">{idx + 4}</td>
                          <td className="px-4 py-3">
                            <Link to={`/influenciadores/${i.id}`} className="font-medium hover:text-primary">
                              {i.nome}
                            </Link>
                            <p className="text-xs text-muted-foreground">{i.instagram || 'sem @'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <ModeloBadge modelo={i.modeloPagamento} />
                          </td>
                          <td
                            className={cn(
                              'px-4 py-3 text-right font-medium tabular-nums',
                              i.metricas.lucro < 0 ? 'text-danger' : 'text-success',
                            )}
                          >
                            {formatBRL(i.metricas.lucro)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                            {formatPercent(i.metricas.roi)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">
                            {criterio.fmt(criterio.get(i))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
