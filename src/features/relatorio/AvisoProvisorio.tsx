import type { RelatorioResponse } from "@/features/relatorio/tipos";

const ITENS: { chave: keyof RelatorioResponse["provisorio"]; rotulo: string }[] =
  [
    { chave: "curva", rotulo: "Curva" },
    { chave: "score", rotulo: "Score" },
    { chave: "textos", rotulo: "Textos" },
  ];

/**
 * Discreto de proposito: sem vermelho, sem icone de erro. O texto sobre O
 * QUE e provisorio vem sempre da resposta — nunca fixo no codigo, para
 * acompanhar sozinho se o backend mudar. Sem <h2> propria (spec 5.1) —
 * fica entre o cabecalho e os cards de resumo.
 */
export function AvisoProvisorio({
  provisorio,
}: {
  provisorio: RelatorioResponse["provisorio"];
}) {
  return (
    <div className="mt-6 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
      <p>
        Esta é uma demonstração. As fórmulas e os textos abaixo ainda são
        provisórios e não representam a análise final.
      </p>
      <ul className="mt-2 list-disc pl-5">
        {ITENS.map((item) => (
          <li key={item.chave}>
            <span className="font-medium text-foreground">{item.rotulo}:</span>{" "}
            {provisorio[item.chave]}
          </li>
        ))}
      </ul>
    </div>
  );
}
