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
import type { LinhaMedidaDetalhe } from "@/features/avaliacoes/detalhe";
import { formatarNumeroOuTraco } from "@/features/shared/formato";

/**
 * Serve tanto para Amplitude quanto para Salto — a forma da tabela e
 * identica (Medida | Valor), so titulo e linhas mudam. A unidade vai junto
 * do rotulo de cada linha via RotuloColuna, nao num cabecalho fixo: e o que
 * permite as duas colunas de Salto sem unidade confirmada conviverem com o
 * CMJ em cm na mesma tabela sem inventar nada.
 */
export function BlocoMedidas({
  id,
  titulo,
  legenda,
  linhas,
}: {
  id: string;
  titulo: string;
  legenda: string;
  linhas: LinhaMedidaDetalhe[];
}) {
  const headingId = `${id}-heading`;

  return (
    <section aria-labelledby={headingId} className="mt-8">
      <h2 id={headingId} className="text-lg font-semibold">
        {titulo}
      </h2>
      <div className="mt-3">
        <Table>
          <TableCaption className="sr-only">{legenda}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Medida</TableHead>
              <TableHead scope="col" className="text-right">
                Valor
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((linha) => (
              <TableRow key={`${linha.chave}-${linha.lado ?? "unico"}`}>
                <TableHead scope="row" className="font-medium">
                  <RotuloColuna coluna={linha} />
                </TableHead>
                <TableCell className="text-right">
                  <ValorOuAusente
                    valor={linha.valor}
                    formatar={formatarNumeroOuTraco}
                  />
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
