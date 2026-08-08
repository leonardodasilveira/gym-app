import Link from "next/link";

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
import { colunasDeMedida, valorDaColuna } from "@/features/alunos/utils";
import {
  formatarData,
  formatarNumeroOuTraco,
} from "@/features/shared/formato";

export function HistoricoAvaliacoes({
  avaliacoes,
  nomeAluno,
}: {
  avaliacoes: AvaliacaoCompleta[];
  nomeAluno: string;
}) {
  const colunas = colunasDeMedida();

  return (
    <section aria-labelledby="historico-heading" className="mt-8">
      <h2 id="historico-heading" className="text-lg font-semibold">
        Histórico de avaliações
      </h2>
      {/*
        13 colunas nao cabem em tela estreita. `min-w-max` faz a tabela manter
        a largura natural e rolar dentro do container que o `Table` ja tem
        (overflow-x-auto), em vez de espremer 13 numeros ate ficarem ilegiveis.
      */}
      <div className="mt-3">
        <Table className="min-w-max">
          <TableCaption className="sr-only">
            Histórico de avaliações de {nomeAluno}, mais recente primeiro
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Data</TableHead>
              {colunas.map((coluna) => (
                <TableHead
                  key={`${coluna.chave}-${coluna.lado ?? "unico"}`}
                  scope="col"
                  className="whitespace-nowrap"
                >
                  <RotuloColuna coluna={coluna} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {avaliacoes.map((avaliacao) => (
              <TableRow key={avaliacao.id}>
                <TableHead scope="row" className="font-medium">
                  <Link
                    href={`/avaliacoes/${avaliacao.id}`}
                    className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                  >
                    {formatarData(avaliacao.dataAvaliacao)}
                  </Link>
                </TableHead>
                {colunas.map((coluna) => (
                  <TableCell key={`${coluna.chave}-${coluna.lado ?? "unico"}`}>
                    <ValorOuAusente
                      valor={valorDaColuna(avaliacao, coluna)}
                      formatar={formatarNumeroOuTraco}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <NotaUnidadeProvisoria colunas={colunas} />
    </section>
  );
}
