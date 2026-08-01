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
import { ValorOuAusente } from "@/components/ui/valor-ausente";
import type { RelatorioResponse } from "@/features/relatorio/tipos";
import {
  formatarNumeroComCasas,
  formatarNumeroOuTraco,
} from "@/features/shared/formato";

/**
 * `cargaKg`/`velocidadeMs` de cada ponto nunca sao nulos (PontoCurva nao tem
 * `| null`) — so `cargaMaximaKg` do objeto `curva` pode ser null.
 */
export function CurvaTabela({ curva }: { curva: RelatorioResponse["curva"] }) {
  if (curva.pontos.length === 0) {
    return (
      <EmptyState titulo="Nenhum ponto de carga registrado nesta avaliação" />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Carga máxima testada:{" "}
        <ValorOuAusente
          valor={curva.cargaMaximaKg}
          formatar={formatarNumeroOuTraco}
        />
        {curva.cargaMaximaKg !== null ? " kg" : null}
      </p>
      <Table>
        <TableCaption className="sr-only">
          Pontos da curva força-velocidade, ordenados por carga crescente
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Teste</TableHead>
            <TableHead scope="col" className="text-right">
              Carga (kg)
            </TableHead>
            <TableHead scope="col" className="text-right">
              Velocidade (m/s)
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {curva.pontos.map((ponto, indice) => (
            <TableRow key={`${ponto.testeCodigo}-${ponto.cargaKg}-${indice}`}>
              <TableHead scope="row" className="font-medium">
                {ponto.testeNome}
              </TableHead>
              <TableCell className="text-right">
                {formatarNumeroComCasas(ponto.cargaKg, 2)}
              </TableCell>
              <TableCell className="text-right">
                {formatarNumeroComCasas(ponto.velocidadeMs, 3)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
