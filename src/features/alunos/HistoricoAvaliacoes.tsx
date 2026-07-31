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
      <div className="mt-3">
        <Table>
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
                >
                  <abbr title={coluna.nomeCompleto} className="no-underline">
                    {coluna.rotulo}
                  </abbr>{" "}
                  <span className="text-muted-foreground">
                    ({coluna.unidade})
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {avaliacoes.map((avaliacao) => (
              <TableRow key={avaliacao.id}>
                <TableHead scope="row" className="font-medium">
                  {formatarData(avaliacao.dataAvaliacao)}
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
    </section>
  );
}
