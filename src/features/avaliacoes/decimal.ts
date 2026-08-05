export type ResultadoNumero = { ok: true; valor: number | null } | { ok: false };

const DECIMAL = /^-?\d+([.,]\d+)?$/;

export function paraNumero(bruto: string): ResultadoNumero {
  const texto = bruto.trim();
  if (texto === "") return { ok: true, valor: null };
  if (!DECIMAL.test(texto)) return { ok: false };
  return { ok: true, valor: Number(texto.replace(",", ".")) };
}
