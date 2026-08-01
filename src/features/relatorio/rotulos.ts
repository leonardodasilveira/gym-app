/**
 * Corrige a acentuacao de rotulos de `perfil`/`nivel` que o backend devolve
 * sem acento (classificarPerfil/calcularScore em src/lib/calculos.ts). E
 * correcao de apresentacao, nao traducao: o sentido do rotulo nao muda.
 *
 * Fallback obrigatorio: uma chave desconhecida passa adiante sem alteracao —
 * nunca vira generico, nunca some.
 */
const MAPA_ACENTUACAO: Record<string, string> = {
  "Orientado a forca": "Orientado a força",
  Medio: "Médio",
};

export function corrigirAcentuacao(rotulo: string): string {
  return MAPA_ACENTUACAO[rotulo] ?? rotulo;
}
