import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RelatorioResponse } from "@/features/relatorio/tipos";
import { formatarData, formatarNumeroOuTraco } from "@/features/shared/formato";

/** Ja vem ordenado ascendente por data (route.ts:101) — nao reordenar. */
export function HistoricoCmjTabela({
  historicoCmj,
}: {
  historicoCmj: RelatorioResponse["historicoCmj"];
}) {
  if (historicoCmj.length === 0) {
    return <EmptyState titulo="Nenhum CMJ registrado no histórico" />;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Considera apenas avaliações com CMJ registrado.
      </p>
      <Table>
        <TableCaption className="sr-only">
          Histórico de CMJ, mais antigo primeiro
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Data</TableHead>
            <TableHead scope="col" className="text-right">
              CMJ (cm)
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {historicoCmj.map((ponto) => (
            <TableRow key={ponto.data}>
              <TableHead scope="row" className="font-medium">
                {formatarData(ponto.data)}
              </TableHead>
              <TableCell className="text-right">
                {formatarNumeroOuTraco(ponto.valor)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
