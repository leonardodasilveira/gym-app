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
import { formatarNumeroComCasas } from "@/features/shared/formato";

type Ajuste = NonNullable<RelatorioResponse["curva"]["ajuste"]>;

/**
 * "Análise técnica" e "Métricas principais" foram fundidas (spec 5.1): o
 * relatório real tem as duas, mas ambas sairiam do mesmo objeto `ajuste` —
 * seriam os mesmos 6 números impressos duas vezes.
 *
 * Unidade no rótulo da linha, nunca repetida na célula — cada métrica tem
 * unidade diferente, então não cabe uma unidade única no cabeçalho da coluna
 * (regra distinta da tabela de medidas, onde todas são cm).
 */
const METRICAS: {
  chave: keyof Ajuste;
  rotulo: string;
  unidade: string;
  casas: number;
}[] = [
  {
    chave: "inclinacao",
    rotulo: "Inclinação",
    unidade: "m/s por kg",
    casas: 5,
  },
  {
    chave: "v0",
    rotulo: "V0 (velocidade teórica máxima)",
    unidade: "m/s",
    casas: 3,
  },
  { chave: "f0", rotulo: "F0 (carga teórica máxima)", unidade: "kg", casas: 2 },
  { chave: "r2", rotulo: "R² (qualidade do ajuste)", unidade: "0 a 1", casas: 3 },
  { chave: "cargaOtimaKg", rotulo: "Carga ótima", unidade: "kg", casas: 2 },
  {
    chave: "velocidadeOtimaMs",
    rotulo: "Velocidade na carga ótima",
    unidade: "m/s",
    casas: 3,
  },
];

export function AnaliseTecnica({ ajuste }: { ajuste: Ajuste | null }) {
  if (ajuste === null) {
    return <EmptyState titulo="Dados insuficientes para ajustar a curva" />;
  }

  return (
    <Table>
      <TableCaption className="sr-only">
        Análise técnica da curva força-velocidade
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Métrica</TableHead>
          <TableHead scope="col" className="text-right">
            Valor
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {METRICAS.map((metrica) => (
          <TableRow key={metrica.chave}>
            <TableHead scope="row" className="font-medium">
              {metrica.rotulo}{" "}
              <span className="text-xs text-muted-foreground">
                ({metrica.unidade})
              </span>
            </TableHead>
            <TableCell className="text-right">
              {formatarNumeroComCasas(ajuste[metrica.chave], metrica.casas)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
