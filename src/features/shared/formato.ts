/**
 * "2026-04-30" -> "30/04/2026". Nunca usar `new Date` sobre a string curta:
 * ela e interpretada como meia-noite UTC e desloca um dia em fusos negativos.
 */
export function formatarData(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Anos completos entre uma data "AAAA-MM-DD" e hoje, por componentes locais. */
export function calcularIdade(dataNascimentoIso: string): number {
  const [ano, mes, dia] = dataNascimentoIso.split("-").map(Number);
  const hoje = new Date();
  const idade = hoje.getFullYear() - ano;
  const aindaNaoFezAniversario =
    hoje.getMonth() + 1 < mes ||
    (hoje.getMonth() + 1 === mes && hoje.getDate() < dia);
  return aindaNaoFezAniversario ? idade - 1 : idade;
}

const formatadorNumero = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

/** null -> "—"; qualquer numero, inclusive 0, formatado em pt-BR. */
export function formatarNumeroOuTraco(valor: number | null): string {
  return valor === null ? "—" : formatadorNumero.format(valor);
}

const formatadorComSinal = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

/** null -> "—" (sem comparacao possivel); numero com sinal explicito. */
export function formatarDeltaOuTraco(valor: number | null): string {
  return valor === null ? "—" : formatadorComSinal.format(valor);
}

/** Arredonda eliminando ruido de ponto flutuante (ex.: 32.5 - 31.9). */
export function arredondar(valor: number, casas = 2): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

/**
 * Formata com um numero de casas decimais configuravel — usado onde 2 casas
 * (o padrao de `formatarNumeroOuTraco`) perdem informacao, ex.: a inclinacao
 * da curva forca-velocidade (-0.01062, precisa de 5 casas).
 */
export function formatarNumeroComCasas(valor: number, casas: number): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: casas,
  }).format(valor);
}

/**
 * Fabrica um formatador null-safe com casas fixas, compativel com a prop
 * `formatar` de `ValorOuAusente`.
 */
export function criarFormatadorComCasas(
  casas: number,
): (valor: number | null) => string {
  return (valor) =>
    valor === null ? "—" : formatarNumeroComCasas(valor, casas);
}

const formatadorDataEmissao = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
});

/**
 * Data de hoje fixada no fuso de Sao Paulo — nao depende do fuso do
 * servidor (mesma classe de bug do risco R5 do frontend-plan.md).
 */
export function dataDeHojeFormatada(): string {
  return formatadorDataEmissao.format(new Date());
}
