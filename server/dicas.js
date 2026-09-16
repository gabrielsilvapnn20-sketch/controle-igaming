import { round2 } from './calc.js';

// Gera dicas/feedbacks automáticos (regras heurísticas) para um influenciador.
// Recebe os lançamentos já hidratados (ordenados por data asc) e a média geral da agência.
export function gerarDicas({ lancamentos, metricas, custoPorCadastroMedioAgencia, hoje = new Date() }) {
  const dicas = [];
  const push = (tipo, titulo, texto) => dicas.push({ tipo, titulo, texto });

  if (lancamentos.length === 0) {
    push('info', 'Sem lançamentos', 'Cadastre lançamentos para gerar análises e recomendações.');
    return dicas;
  }

  const ordenados = [...lancamentos].sort((a, b) => a.data.localeCompare(b.data));

  // Prejuízo consistente nos últimos 3 lançamentos
  const ultimos3 = ordenados.slice(-3);
  if (ultimos3.length === 3 && ultimos3.every((l) => l.lucro < 0)) {
    push(
      'perigo',
      'Prejuízo consistente',
      'Os últimos 3 lançamentos fecharam no prejuízo. Reavalie o modelo de pagamento ou a performance da divulgação.',
    );
  } else if (metricas.lucro < 0) {
    push(
      'perigo',
      'Parceria no vermelho',
      `Lucro acumulado negativo (${formatBRL(metricas.lucro)}). Essa parceria precisa de atenção.`,
    );
  }

  // ROI alto → considerar aumentar investimento
  if (metricas.roi != null && metricas.roi >= 100) {
    push(
      'sucesso',
      'ROI acima de 100%',
      `ROI de ${metricas.roi}%. Excelente retorno — considere aumentar o investimento nesse influenciador.`,
    );
  } else if (metricas.roi != null && metricas.roi < 0) {
    push('perigo', 'ROI negativo', `ROI de ${metricas.roi}%. Você está gastando mais do que retorna.`);
  }

  // Custo por cadastro acima da média da agência
  if (
    metricas.custoPorCadastro != null &&
    custoPorCadastroMedioAgencia != null &&
    custoPorCadastroMedioAgencia > 0 &&
    metricas.custoPorCadastro > custoPorCadastroMedioAgencia
  ) {
    const pct = round2(
      ((metricas.custoPorCadastro - custoPorCadastroMedioAgencia) / custoPorCadastroMedioAgencia) * 100,
    );
    if (pct >= 20) {
      push(
        'alerta',
        'Custo por cadastro elevado',
        `Custo por cadastro ${pct}% acima da média geral da agência (${formatBRL(
          metricas.custoPorCadastro,
        )} vs ${formatBRL(custoPorCadastroMedioAgencia)}).`,
      );
    }
  }

  // Sem lançamentos há mais de N dias
  const ultimaData = new Date(ordenados[ordenados.length - 1].data + 'T00:00:00');
  const diasSemLancar = Math.floor((hoje - ultimaData) / (1000 * 60 * 60 * 24));
  const N = 14;
  if (diasSemLancar > N) {
    push(
      'alerta',
      'Parceria parada',
      `Sem lançamentos há ${diasSemLancar} dias. Verifique se a divulgação continua ativa.`,
    );
  }

  // Tendência positiva
  if (ultimos3.length === 3 && ultimos3.every((l) => l.lucro > 0)) {
    push('sucesso', 'Tendência positiva', 'Os últimos 3 lançamentos foram lucrativos. Boa consistência!');
  }

  if (dicas.length === 0) {
    push('info', 'Tudo estável', 'Nenhum alerta relevante no momento. Performance dentro do esperado.');
  }

  return dicas;
}

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
