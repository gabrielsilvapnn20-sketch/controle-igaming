import { useEffect, useState } from 'react';
import { Percent, Save, History, Info, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared';
import { api } from '@/lib/api';
import { formatData, formatPercent } from '@/lib/format';

export default function Configuracoes() {
  const [config, setConfig] = useState(null);
  const [historico, setHistorico] = useState(null);
  const [valor, setValor] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);

  function carregar() {
    api.getConfig().then((c) => {
      setConfig(c);
      setValor(String(c.minhaParticipacao));
    });
    api.getConfigHistorico().then(setHistorico);
  }
  useEffect(carregar, []);

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setOk(false);
    const n = Number(valor);
    if (Number.isNaN(n) || n < 0 || n > 100) {
      setErro('Informe um valor entre 0 e 100.');
      return;
    }
    setSalvando(true);
    try {
      const c = await api.updateConfig(n);
      setConfig(c);
      const h = await api.getConfigHistorico();
      setHistorico(h);
      setOk(true);
      setTimeout(() => setOk(false), 2500);
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  const alterado = config && Number(valor) !== config.minhaParticipacao;

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Parâmetros globais da agência" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Participação global */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" />
              Sua participação global
            </CardTitle>
            <CardDescription>
              Percentual da receita bruta que fica com a agência (o restante é do dono da plataforma).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!config ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <form onSubmit={salvar} className="space-y-4">
                <div>
                  <Label>Participação da agência (%)</Label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={valor}
                        onChange={(e) => setValor(e.target.value)}
                        className="pr-9 text-lg font-semibold"
                      />
                      <Percent className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                    <Button type="submit" disabled={salvando || !alterado}>
                      <Save className="h-4 w-4" />
                      {salvando ? 'Salvando…' : 'Salvar'}
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3.5 text-sm">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                  <p className="text-muted-foreground">
                    Alterar este valor <strong className="text-foreground">não recalcula</strong> lançamentos
                    antigos. Cada lançamento guarda o percentual vigente no momento em que foi criado (snapshot
                    histórico).
                  </p>
                </div>

                {ok && (
                  <p className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    Participação atualizada com sucesso.
                  </p>
                )}
                {erro && (
                  <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                    {erro}
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
                  Atual: <strong className="text-foreground">{formatPercent(config.minhaParticipacao)}</strong> ·
                  atualizado em {formatData(config.atualizadoEm)}
                </p>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Histórico */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              Histórico de alterações
            </CardTitle>
            <CardDescription>Registro das mudanças no percentual da agência</CardDescription>
          </CardHeader>
          <CardContent>
            {!historico ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : historico.length === 0 ? (
              <EmptyState
                icon={History}
                title="Sem alterações"
                description="As mudanças no percentual aparecerão aqui."
              />
            ) : (
              <div className="relative space-y-1 pl-4">
                <div className="absolute inset-y-2 left-[3px] w-px bg-border" />
                {historico.map((h) => (
                  <div key={h.id} className="relative py-2">
                    <div className="absolute -left-[13px] top-3.5 h-2 w-2 rounded-full bg-primary ring-4 ring-background" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {h.valorAnterior != null && (
                          <span className="text-sm text-muted-foreground line-through">
                            {formatPercent(h.valorAnterior)}
                          </span>
                        )}
                        <span className="text-sm font-semibold text-primary">
                          → {formatPercent(h.minhaParticipacao)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatData(h.alteradoEm)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
