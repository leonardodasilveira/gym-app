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
import type { RelatorioResponse } from "@/features/relatorio/tipos";
import { formatarNumeroOuTraco } from "@/features/shared/formato";

/**
 * `medidasDetalhadas` ja vem achatado do backend, com sigla e rotulo prontos
 * (src/lib/avaliacoes.ts:83) — nao importar o catalogo MEDIDAS aqui, nao
 * derivar coluna de novo.
 */
export function MedidasTabela({
  medidasDetalhadas,
}: {
  medidasDetalhadas: RelatorioResponse["medidasDetalhadas"];
}) {
  return (
    <Table>
      <TableCaption className="sr-only">
        Medidas registradas na avaliação
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Medida</TableHead>
          <TableHead scope="col" className="text-right">
            Valor (cm)
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {medidasDetalhadas.flatMap((medida) =>
          medida.valores.map((valor) => (
            <TableRow key={`${medida.chave}-${valor.lado ?? "unico"}`}>
              <TableHead scope="row" className="font-medium">
                <abbr title={valor.rotulo} className="no-underline">
                  {valor.sigla}
                </abbr>
              </TableHead>
              <TableCell className="text-right">
                <ValorOuAusente
                  valor={valor.valor}
                  formatar={formatarNumeroOuTraco}
                />
              </TableCell>
            </TableRow>
          )),
        )}
      </TableBody>
    </Table>
  );
}
