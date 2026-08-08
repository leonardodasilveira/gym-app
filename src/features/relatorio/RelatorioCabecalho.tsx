import type { RelatorioResponse } from "@/features/relatorio/tipos";
import { formatarData } from "@/features/shared/formato";

/**
 * O periodo/historico cobrem o aluno inteiro, nao a avaliacao relatada —
 * por isso a avaliacao de referencia e destacada primeiro, e a linha de
 * periodo usa os rotulos exigidos pela spec (nunca "atual"/"total").
 */
export function RelatorioCabecalho({
  aluno,
  avaliacao,
  periodo,
  resumoCmj,
}: {
  aluno: RelatorioResponse["aluno"];
  avaliacao: RelatorioResponse["avaliacao"];
  periodo: RelatorioResponse["periodo"];
  resumoCmj: RelatorioResponse["resumoCmj"];
}) {
  return (
    <header>
      <h1 className="break-words text-2xl font-semibold tracking-tight">
        Relatório de performance
      </h1>
      <p className="mt-2 text-base font-medium">
        {aluno.nome}
        <span className="font-normal text-muted-foreground">
          {" "}
          · avaliação de referência: {formatarData(avaliacao.dataAvaliacao)}
        </span>
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {periodo.semanas === null ? (
          <>
            Histórico completo do aluno: {formatarData(periodo.de)} a{" "}
            {formatarData(periodo.ate)} · {periodo.totalAvaliacoes} avaliações
            com CMJ.
          </>
        ) : (
          <>
            Janela de {periodo.semanas} semanas terminando em{" "}
            {formatarData(avaliacao.dataAvaliacao)}. Dados no período:{" "}
            {formatarData(periodo.de)} a {formatarData(periodo.ate)} ·{" "}
            {periodo.totalAvaliacoes} avaliações com CMJ.
          </>
        )}
      </p>
      {periodo.totalAvaliacoes === 0 || resumoCmj === null ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhuma avaliação com CMJ nesta janela. Isso não é um erro — amplie
          o período para ver a evolução.
        </p>
      ) : null}
      {avaliacao.observacoes !== null ? (
        <p className="mt-3 text-sm">{avaliacao.observacoes}</p>
      ) : null}
    </header>
  );
}
