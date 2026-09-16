import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatBRL, hojeISO } from '@/lib/format';

const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0);

// Estado inicial do formulário conforme o influenciador e (opcional) lançamento em edição.
function estadoInicial(influenciador, lancamento, participacaoGlobal) {
  if (lancamento) {
    return {
      data: lancamento.data,
      cadastros: String(lancamento.cadastros ?? ''),
      depositos: (lancamento.depositos || []).map((v) => String(v)),
      receitaBruta: String(lancamento.receitaBruta ?? ''),
      percentualAplicado: String(lancamento.percentualAplicado ?? ''),
      gastosExtras: String(lancamento.gastosExtras ?? ''),
      observacoes: lancamento.observacoes || '',
      quantidadeStories: lancamento.quantidadeStories != null ? String(lancamento.quantidadeStories) : '',
      valorCobrado: lancamento.valorCobrado != null ? String(lancamento.valorCobrado) : '',
      valorPago: lancamento.valorPago != null ? String(lancamento.valorPago) : '',
    };
  }
  return {
    data: hojeISO(),
    cadastros: '',
    depositos: [],
    receitaBruta: '',
    percentualAplicado: String(participacaoGlobal ?? 80),
    gastosExtras: '',
    observacoes: '',
    quantidadeStories: '',
    valorCobrado: '',
    valorPago: influenciador?.modeloPagamento === 'fixo' && influenciador?.valorFixo != null
      ? String(influenciador.valorFixo)
      : '',
  };
}

export function LancamentoForm({ open, onClose, onSaved, influenciador, lancamento, participacaoGlobal }) {
  const editando = Boolean(lancamento);
  const modelo = influenciador?.modeloPagamento;
  const [form, setForm] = useState(() => estadoInicial(influenciador, lancamento, participacaoGlobal));
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [initFor, setInitFor] = useState(null);

  const chave = lancamento?.id ?? 'novo';
  if (open && initFor !== chave) {
    setForm(estadoInicial(influenciador, lancamento, participacaoGlobal));
    setErro('');
    setInitFor(chave);
  }
  if (!open && initFor !== null) setInitFor(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // ---- prévia de cálculo (mesma regra do servidor) ----
  const totalDepositos = form.depositos.reduce((a, v) => a + num(v), 0);
  const receitaLiquida = (num(form.receitaBruta) * num(form.percentualAplicado)) / 100;
  let valorPago = 0;
  if (modelo === 'stories') valorPago = num(form.valorCobrado);
  else if (modelo === 'fixo') valorPago = num(form.valorPago);
  else if (modelo === 'percentual')
    valorPago =
      form.valorPago !== '' ? num(form.valorPago) : (totalDepositos * num(influenciador?.percentualComissao)) / 100;
  const lucro = receitaLiquida - valorPago - num(form.gastosExtras);
  const custoPorStory =
    modelo === 'stories' && num(form.quantidadeStories) > 0
      ? num(form.valorCobrado) / num(form.quantidadeStories)
      : null;

  function setDeposito(idx, valor) {
    setForm((f) => {
      const d = [...f.depositos];
      d[idx] = valor;
      return { ...f, depositos: d };
    });
  }
  function addDeposito() {
    setForm((f) => ({ ...f, depositos: [...f.depositos, ''] }));
  }
  function removeDeposito(idx) {
    setForm((f) => ({ ...f, depositos: f.depositos.filter((_, i) => i !== idx) }));
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    if (!form.data) return setErro('A data é obrigatória.');
    setSalvando(true);
    const payload = {
      influenciadorId: influenciador.id,
      data: form.data,
      cadastros: num(form.cadastros),
      depositos: form.depositos.map(num).filter((v, i) => form.depositos[i] !== ''),
      receitaBruta: num(form.receitaBruta),
      percentualAplicado: num(form.percentualAplicado),
      gastosExtras: num(form.gastosExtras),
      observacoes: form.observacoes.trim() || null,
    };
    if (modelo === 'stories') {
      payload.quantidadeStories = num(form.quantidadeStories);
      payload.valorCobrado = num(form.valorCobrado);
    }
    if (modelo === 'fixo') payload.valorPago = form.valorPago === '' ? null : num(form.valorPago);
    if (modelo === 'percentual') payload.valorPago = form.valorPago === '' ? null : num(form.valorPago);

    try {
      const saved = editando
        ? await api.updateLancamento(lancamento.id, payload)
        : await api.createLancamento(payload);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-2xl">
      <DialogHeader
        title={editando ? 'Editar lançamento' : 'Novo lançamento'}
        description={`${influenciador?.nome} · modelo ${modelo}`}
      />
      <form onSubmit={salvar}>
        <DialogBody className="max-h-[65vh] space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label>Data *</Label>
              <Input type="date" value={form.data} onChange={set('data')} max={hojeISO()} />
            </div>
            <div>
              <Label>Cadastros gerados</Label>
              <Input type="number" min="0" value={form.cadastros} onChange={set('cadastros')} placeholder="0" />
            </div>
            <div>
              <Label>Gastos extras (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.gastosExtras}
                onChange={set('gastosExtras')}
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Campos específicos por modelo */}
          {modelo === 'stories' && (
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4 sm:grid-cols-3">
              <div>
                <Label>Qtd. de stories</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.quantidadeStories}
                  onChange={set('quantidadeStories')}
                  placeholder="Ex: 3"
                />
              </div>
              <div>
                <Label>Valor cobrado (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valorCobrado}
                  onChange={set('valorCobrado')}
                  placeholder="Ex: 250"
                />
              </div>
              <div className="flex flex-col justify-end">
                <Label>Custo por story</Label>
                <div className="flex h-10 items-center rounded-lg border border-border bg-background/40 px-3 text-sm font-medium tabular-nums text-fuchsia-300">
                  {custoPorStory != null ? formatBRL(custoPorStory) : '—'}
                </div>
              </div>
            </div>
          )}

          {modelo === 'fixo' && (
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
              <Label>Valor pago neste lançamento (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.valorPago}
                onChange={set('valorPago')}
                placeholder={influenciador?.valorFixo ? String(influenciador.valorFixo) : '0,00'}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Herdado do valor fixo cadastrado ({formatBRL(influenciador?.valorFixo || 0)}). Ajuste para
                reajustes pontuais.
              </p>
            </div>
          )}

          {modelo === 'percentual' && (
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
              <Label>Valor pago (auto = {influenciador?.percentualComissao ?? 0}% dos depósitos)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.valorPago}
                onChange={set('valorPago')}
                placeholder={formatBRL((totalDepositos * num(influenciador?.percentualComissao)) / 100)}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Calculado automaticamente sobre a soma dos depósitos. Deixe vazio para usar o valor
                automático, ou informe para revisar.
              </p>
            </div>
          )}

          {/* Depósitos */}
          <div className="rounded-xl border border-border bg-secondary/20 p-4">
            <div className="mb-2 flex items-center justify-between">
              <Label className="mb-0">Depósitos gerados (valores individuais)</Label>
              <Button type="button" variant="subtle" size="sm" onClick={addDeposito}>
                <Plus className="h-3.5 w-3.5" />
                Depósito
              </Button>
            </div>
            {form.depositos.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum depósito. Adicione se houver.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {form.depositos.map((d, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={d}
                      onChange={(e) => setDeposito(i, e.target.value)}
                      placeholder="0,00"
                      className="h-9"
                    />
                    <button
                      type="button"
                      onClick={() => removeDeposito(i)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Soma dos depósitos: <span className="font-medium text-foreground">{formatBRL(totalDepositos)}</span>
            </p>
          </div>

          {/* Receita */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label>Receita bruta (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.receitaBruta}
                onChange={set('receitaBruta')}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label>% aplicado (sua fatia)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.percentualAplicado}
                onChange={set('percentualAplicado')}
              />
            </div>
            <div className="flex flex-col justify-end">
              <Label>Receita líquida</Label>
              <div className="flex h-10 items-center rounded-lg border border-border bg-background/40 px-3 text-sm font-medium tabular-nums text-primary">
                {formatBRL(receitaLiquida)}
              </div>
            </div>
          </div>

          {/* Prévia do lucro */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-background/40 px-4 py-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Lucro do lançamento</span>
              <p className="text-xs text-muted-foreground">Receita líquida − valor pago − gastos extras</p>
            </div>
            <span
              className={
                'text-xl font-bold tabular-nums ' + (lucro < 0 ? 'text-danger' : 'text-success')
              }
            >
              {formatBRL(lucro)}
            </span>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={set('observacoes')} placeholder="Notas do lançamento…" />
          </div>

          {erro && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {erro}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando…' : editando ? 'Salvar' : 'Adicionar lançamento'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
