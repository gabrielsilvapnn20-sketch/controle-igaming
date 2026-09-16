import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge, ModeloBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared';
import { InfluenciadorForm } from '@/components/InfluenciadorForm';
import { api } from '@/lib/api';
import { formatBRL, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

const ORDENACOES = [
  { v: 'nome', label: 'Nome' },
  { v: 'lucro', label: 'Lucro acumulado' },
  { v: 'roi', label: 'ROI' },
  { v: 'lancamentos', label: 'Nº de lançamentos' },
];

export default function Influenciadores() {
  const navigate = useNavigate();
  const [lista, setLista] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroModelo, setFiltroModelo] = useState('todos');
  const [ordenar, setOrdenar] = useState('nome');
  const [dialogOpen, setDialogOpen] = useState(false);

  function carregar() {
    api.listInfluenciadores().then(setLista);
  }
  useEffect(carregar, []);

  const filtrada = useMemo(() => {
    if (!lista) return [];
    let r = lista.filter((i) => {
      const q = busca.trim().toLowerCase();
      const matchBusca =
        !q || i.nome.toLowerCase().includes(q) || (i.instagram || '').toLowerCase().includes(q);
      const matchStatus = filtroStatus === 'todos' || i.status === filtroStatus;
      const matchModelo = filtroModelo === 'todos' || i.modeloPagamento === filtroModelo;
      return matchBusca && matchStatus && matchModelo;
    });
    r = [...r].sort((a, b) => {
      switch (ordenar) {
        case 'lucro':
          return b.metricas.lucro - a.metricas.lucro;
        case 'roi':
          return (b.metricas.roi ?? -Infinity) - (a.metricas.roi ?? -Infinity);
        case 'lancamentos':
          return b.metricas.qtdLancamentos - a.metricas.qtdLancamentos;
        default:
          return a.nome.localeCompare(b.nome);
      }
    });
    return r;
  }, [lista, busca, filtroStatus, filtroModelo, ordenar]);

  return (
    <div>
      <PageHeader title="Influenciadores" subtitle="Gerencie parcerias e acompanhe a rentabilidade de cada uma">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo influenciador
        </Button>
      </PageHeader>

      {/* Filtros */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou @…"
            className="pl-9"
          />
        </div>
        <Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="sm:w-44">
          <option value="todos">Todos os status</option>
          <option value="negociando">Negociando</option>
          <option value="fechado">Fechado</option>
          <option value="pausado">Pausado</option>
        </Select>
        <Select value={filtroModelo} onChange={(e) => setFiltroModelo(e.target.value)} className="sm:w-44">
          <option value="todos">Todos os modelos</option>
          <option value="stories">Stories</option>
          <option value="fixo">Fixo</option>
          <option value="percentual">Percentual</option>
        </Select>
        <Select value={ordenar} onChange={(e) => setOrdenar(e.target.value)} className="sm:w-52">
          {ORDENACOES.map((o) => (
            <option key={o.v} value={o.v}>
              Ordenar: {o.label}
            </option>
          ))}
        </Select>
      </div>

      {!lista ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : filtrada.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title={lista.length === 0 ? 'Nenhum influenciador cadastrado' : 'Nenhum resultado'}
            description={
              lista.length === 0
                ? 'Cadastre seu primeiro influenciador para começar a controlar as parcerias.'
                : 'Ajuste os filtros ou a busca.'
            }
            action={
              lista.length === 0 ? (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Novo influenciador
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrada.map((i) => {
            const lucro = i.metricas.lucro;
            const negativo = lucro < 0;
            return (
              <Card
                key={i.id}
                onClick={() => navigate(`/influenciadores/${i.id}`)}
                className="group cursor-pointer p-5 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">{i.nome}</p>
                    <p className="truncate text-sm text-muted-foreground">{i.instagram || 'sem @'}</p>
                  </div>
                  <StatusBadge status={i.status} />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <ModeloBadge modelo={i.modeloPagamento} />
                  <span className="text-xs text-muted-foreground">
                    {i.metricas.qtdLancamentos} lançamento{i.metricas.qtdLancamentos === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Lucro acumulado</p>
                    <p
                      className={cn(
                        'mt-0.5 flex items-center gap-1 text-lg font-bold tabular-nums',
                        negativo ? 'text-danger' : 'text-success',
                      )}
                    >
                      {negativo ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                      {formatBRL(lucro)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">ROI</p>
                    <p className="mt-0.5 text-lg font-bold tabular-nums">{formatPercent(i.metricas.roi)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <InfluenciadorForm open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={carregar} />
    </div>
  );
}
