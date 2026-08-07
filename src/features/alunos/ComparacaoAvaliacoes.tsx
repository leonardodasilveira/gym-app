import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ValorOuAusente } from "@/components/ui/valor-ausente";
import {
  NotaUnidadeProvisoria,
  RotuloColuna,
} from "@/features/alunos/RotuloColuna";
import type { AvaliacaoCompleta } from "@/features/alunos/tipos";
import { montarLinhasComparacao } from "@/features/alunos/utils";
import {
  formatarData,
  formatarDeltaOuTraco,
  formatarNumeroOuTraco,
} from "@/features/shared/formato";

/**
 * Variacao e sempre um numero neutro com sinal — nunca cor, nunca seta de
 * melhora/piora. Ninguem confirmou a direcao desejavel de TOR/QUA/IQT, e SLB
 * nem foi decifrado ainda (docs/planilha-atual.md, duvida 12).
 */
export function ComparacaoAvaliacoes({
  atual,
  anterior,
}: {
  atual: AvaliacaoCompleta;
  anterior: AvaliacaoCompleta;
}) {
  const linhas = montarLinhasComparacao(atual, anterior);
  const dataAnterior = formatarData(anterior.dataAvaliacao);
  const dataAtual = formatarData(atual.dataAvaliacao);

  return (
    <section aria-labelledby="comparacao-heading" className="mt-8">
      <h2 id="comparacao-heading" className="text-lg font-semibold">
        Comparação com a avaliação anterior
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {dataAnterior} → {dataAtual}
      </p>
      <div className="mt-3">
        <Table>
          <TableCaption className="sr-only">
            Comparação de medidas entre a avaliação de {dataAnterior} e a de{" "}
            {dataAtual}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Medida</TableHead>
              <TableHead scope="col" className="text-right">
                Anterior
              </TableHead>
              <TableHead scope="col" className="text-right">
                Atual
              </TableHead>
              <TableHead scope="col" className="text-right">
                Variação
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((linha) => (
              <TableRow key={linha.rotulo}>
                <TableHead scope="row" className="font-medium">
                  <RotuloColuna coluna={linha} />
                </TableHead>
                <TableCell className="text-right">
                  <ValorOuAusente
                    valor={linha.anterior}
                    formatar={formatarNumeroOuTraco}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <ValorOuAusente
                    valor={linha.atual}
                    formatar={formatarNumeroOuTraco}
                  />
                </TableCell>
                <TableCell className="text-right">
                  {linha.delta === 0 ? (
                    <span aria-label="sem variação">
                      {formatarDeltaOuTraco(linha.delta)}
                    </span>
                  ) : (
                    <ValorOuAusente
                      valor={linha.delta}
                      formatar={formatarDeltaOuTraco}
                      textoAusente="sem comparação"
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <NotaUnidadeProvisoria colunas={linhas} />
    </section>
  );
}
