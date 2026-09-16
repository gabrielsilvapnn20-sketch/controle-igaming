// Lógica de cálculo dos valores derivados de um lançamento.
// Centralizada aqui para que servidor e (eventualmente) testes usem a mesma regra.

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function somaDepositos(depositos) {
  if (!Array.isArray(depositos)) return 0;
  return round2(depositos.reduce((acc, v) => acc + (Number(v) || 0), 0));
}

/**
 * Calcula receita líquida, valor pago e lucro de um lançamento,
 * respeitando o modelo de pagamento do influenciador.
 */
export function calcularLancamento(input, influenciador) {
  const receitaBruta = Number(input.receitaBruta) || 0;
  const percentualAplicado = Number(input.percentualAplicado) || 0;
  const gastosExtras = Number(input.gastosExtras) || 0;
  const depositos = Array.isArray(input.depositos) ? input.depositos.map((v) => Number(v) || 0) : [];
  const totalDepositos = somaDepositos(depositos);

  const receitaLiquida = round2((receitaBruta * percentualAplicado) / 100);

  let valorPago = 0;
  let quantidadeStories = null;
  let valorCobrado = null;

  switch (influenciador.modelo_pagamento) {
    case 'stories': {
      quantidadeStories = Number(input.quantidadeStories) || 0;
      valorCobrado = Number(input.valorCobrado) || 0;
      valorPago = round2(valorCobrado);
      break;
    }
    case 'fixo': {
      // Herdado do cadastro, mas editável no lançamento específico.
      valorPago =
        input.valorPago != null && input.valorPago !== ''
          ? round2(Number(input.valorPago))
          : round2(Number(influenciador.valor_fixo) || 0);
      break;
    }
    case 'percentual': {
      const pct = Number(influenciador.percentual_comissao) || 0;
      // Calculado automaticamente, mas revisável (se enviado explicitamente).
      valorPago =
        input.valorPago != null && input.valorPago !== ''
          ? round2(Number(input.valorPago))
          : round2((totalDepositos * pct) / 100);
      break;
    }
    default:
      valorPago = round2(Number(input.valorPago) || 0);
  }

  const lucro = round2(receitaLiquida - valorPago - gastosExtras);

  return {
    receitaBruta: round2(receitaBruta),
    percentualAplicado,
    receitaLiquida,
    gastosExtras: round2(gastosExtras),
    valorPago,
    lucro,
    totalDepositos,
    quantidadeStories,
    valorCobrado: valorCobrado != null ? round2(valorCobrado) : null,
    custoPorStory:
      quantidadeStories && quantidadeStories > 0 ? round2(valorCobrado / quantidadeStories) : null,
  };
}

// Converte a linha do banco em objeto de domínio com campos derivados.
export function hidratarLancamento(row) {
  const depositos = JSON.parse(row.depositos || '[]');
  const totalDepositos = somaDepositos(depositos);
  const lucro = round2(row.receita_liquida - row.valor_pago - row.gastos_extras);
  return {
    id: row.id,
    influenciadorId: row.influenciador_id,
    data: row.data,
    cadastros: row.cadastros,
    depositos,
    totalDepositos,
    receitaBruta: row.receita_bruta,
    percentualAplicado: row.percentual_aplicado,
    receitaLiquida: row.receita_liquida,
    gastosExtras: row.gastos_extras,
    valorPago: row.valor_pago,
    quantidadeStories: row.quantidade_stories,
    valorCobrado: row.valor_cobrado,
    custoPorStory:
      row.quantidade_stories && row.quantidade_stories > 0
        ? round2(row.valor_cobrado / row.quantidade_stories)
        : null,
    lucro,
    observacoes: row.observacoes,
    criadoEm: row.criado_em,
  };
}

// Métricas agregadas de um conjunto de lançamentos (já hidratados).
export function agregarMetricas(lancamentos) {
  const acc = {
    receitaBrutaTotal: 0,
    receitaLiquidaTotal: 0,
    totalPago: 0,
    gastosExtrasTotal: 0,
    lucro: 0,
    cadastrosTotais: 0,
    depositosTotais: 0,
    qtdDepositos: 0,
    totalStories: 0,
    qtdLancamentos: lancamentos.length,
  };
  for (const l of lancamentos) {
    acc.receitaBrutaTotal += l.receitaBruta;
    acc.receitaLiquidaTotal += l.receitaLiquida;
    acc.totalPago += l.valorPago;
    acc.gastosExtrasTotal += l.gastosExtras;
    acc.lucro += l.lucro;
    acc.cadastrosTotais += l.cadastros;
    acc.depositosTotais += l.totalDepositos;
    acc.qtdDepositos += l.depositos.length;
    if (l.quantidadeStories) acc.totalStories += l.quantidadeStories;
  }
  for (const k of Object.keys(acc)) acc[k] = round2(acc[k]);

  const investimento = acc.totalPago + acc.gastosExtrasTotal;
  acc.roi = investimento > 0 ? round2((acc.lucro / investimento) * 100) : null;
  acc.custoPorCadastro = acc.cadastrosTotais > 0 ? round2(investimento / acc.cadastrosTotais) : null;
  acc.custoMedioPorStory = acc.totalStories > 0 ? round2(acc.totalPago / acc.totalStories) : null;
  return acc;
}

export { round2 };
