import type { ColunaMedida, LinhaComparacao } from "@/features/alunos/utils";

type Rotulavel = Pick<
  ColunaMedida | LinhaComparacao,
  "rotulo" | "nomeCompleto" | "unidade"
>;

/**
 * Rotulo de medida com a unidade entre parenteses — usado no cabecalho do
 * historico e na primeira coluna da comparacao.
 *
 * Quando `unidade` e null (os quatro saltos novos, bloqueio B6) o parenteses
 * inteiro sai, em vez de imprimir "()" vazio. A explicacao nao vai no rotulo
 * porque sao ate quatro colunas numa tabela ja larga: vai uma vez so, no
 * `NotaUnidadeProvisoria` abaixo da tabela.
 */
export function RotuloColuna({ coluna }: { coluna: Rotulavel }) {
  return (
    <>
      <abbr title={coluna.nomeCompleto} className="no-underline">
        {coluna.rotulo}
      </abbr>
      {coluna.unidade !== null ? (
        <span className="text-muted-foreground"> ({coluna.unidade})</span>
      ) : null}
    </>
  );
}

/**
 * Mesma conversa que o `SaltosFieldset` ja faz no formulario, no mesmo tom:
 * dizer que o numero e puro em vez de fingir uma unidade. Nao renderiza nada
 * quando todas as colunas tem unidade — o dia em que o B6 for respondido, a
 * nota some sozinha.
 */
export function NotaUnidadeProvisoria({ colunas }: { colunas: Rotulavel[] }) {
  const semUnidade = colunas.filter((coluna) => coluna.unidade === null);

  if (semUnidade.length === 0) return null;

  return (
    <p className="mt-2 text-sm text-muted-foreground">
      Unidade ainda não confirmada com o professor
      {": "}
      {semUnidade.map((coluna) => coluna.rotulo).join(", ")}. Os valores estão
      registrados como número puro, sem cm, % ou m/s, até o catálogo definitivo.
    </p>
  );
}
