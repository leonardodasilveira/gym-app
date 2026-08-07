import type { RelatorioResponse } from "@/features/relatorio/tipos";

const ROTULOS: Record<string, string> = { textos: "Textos" };

/** Sem entrada em ROTULOS: `saltos` -> `Saltos`. Evita item sem rotulo. */
const rotularChave = (chave: string) =>
  ROTULOS[chave] ?? chave.charAt(0).toUpperCase() + chave.slice(1);

/**
 * Discreto de proposito: sem vermelho, sem icone de erro. O texto sobre O
 * QUE e provisorio vem sempre da resposta — nunca fixo no codigo, para
 * acompanhar sozinho se o backend mudar. Sem <h2> propria (spec 5.1) —
 * fica logo abaixo do cabecalho.
 *
 * A lista de chaves tambem passou a sair da resposta. Antes era um array fixo
 * com `curva`, `score` e `textos`: quando as duas primeiras sumiram do backend,
 * o componente continuou prometendo explicar coisas que nao chegavam mais. Ler
 * as chaves de `provisorio` cumpre o que o comentario acima ja dizia.
 */
export function AvisoProvisorio({
  provisorio,
}: {
  provisorio: RelatorioResponse["provisorio"];
}) {
  const itens = Object.entries(provisorio);

  if (itens.length === 0) return null;

  return (
    <div className="mt-6 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
      <p>
        Esta é uma demonstração. As fórmulas e os textos abaixo ainda são
        provisórios e não representam a análise final.
      </p>
      <ul className="mt-2 list-disc pl-5">
        {itens.map(([chave, descricao]) => (
          <li key={chave}>
            <span className="font-medium text-foreground">
              {rotularChave(chave)}:
            </span>{" "}
            {descricao}
          </li>
        ))}
      </ul>
    </div>
  );
}
