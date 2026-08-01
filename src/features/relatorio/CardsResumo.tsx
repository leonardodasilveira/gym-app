import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ValorOuAusente } from "@/components/ui/valor-ausente";
import { corrigirAcentuacao } from "@/features/relatorio/rotulos";
import type { RelatorioResponse } from "@/features/relatorio/tipos";
import { formatarNumeroOuTraco } from "@/features/shared/formato";

/**
 * Score e perfil vem de formula provisoria (src/lib/calculos.ts) — por isso
 * o selo "Provisório". CMJ mais recente e medicao real, sem selo.
 * Sem cor semantica em nenhum dos tres: nao e interpretacao de desempenho.
 */
export function CardsResumo({
  resumoCmj,
  score,
  perfil,
}: {
  resumoCmj: RelatorioResponse["resumoCmj"];
  score: RelatorioResponse["score"];
  perfil: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader>
          <CardDescription>CMJ mais recente do histórico</CardDescription>
          <CardTitle className="text-2xl">
            <ValorOuAusente
              valor={resumoCmj?.atual.valor ?? null}
              formatar={formatarNumeroOuTraco}
            />
            {resumoCmj !== null ? " cm" : null}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardDescription>Score</CardDescription>
            <Badge variant="outline">Provisório</Badge>
          </div>
          <CardTitle className="text-2xl">{score.valor} / 100</CardTitle>
          <p className="text-sm text-muted-foreground">
            {corrigirAcentuacao(score.nivel)}
          </p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardDescription>Perfil</CardDescription>
            <Badge variant="outline">Provisório</Badge>
          </div>
          <CardTitle className="text-2xl">{corrigirAcentuacao(perfil)}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
