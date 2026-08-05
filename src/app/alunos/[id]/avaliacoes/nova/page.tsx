import { notFound } from "next/navigation";
import { AvaliacaoFormV2 } from "@/features/avaliacoes/AvaliacaoFormV2";
import { referenciaV2DeAvaliacaoV1 } from "@/features/avaliacoes/mappers";
import type { AlunoDetalhe, AvaliacaoCompleta } from "@/features/alunos/tipos";
import { apiFetch } from "@/features/shared/api";
import { hojeIsoSaoPaulo } from "@/features/shared/formato";
import { origemAtual } from "@/features/shared/origem";

export default async function NovaAvaliacaoPage({ params }: PageProps<"/alunos/[id]/avaliacoes/nova">) {
  const { id } = await params; const origem = await origemAtual(); const codificado = encodeURIComponent(id);
  const [resultadoAluno, resultadoReferencia] = await Promise.all([apiFetch<AlunoDetalhe>(`${origem}/api/alunos/${codificado}`), apiFetch<AvaliacaoCompleta[]>(`${origem}/api/avaliacoes?alunoId=${codificado}&limite=1`)]);
  if (!resultadoAluno.ok) { if (resultadoAluno.erro.status === 404) notFound(); throw new Error(resultadoAluno.erro.mensagem); }
  if (!resultadoReferencia.ok) throw new Error(resultadoReferencia.erro.mensagem);
  const anterior = resultadoReferencia.dados[0];
  return <AvaliacaoFormV2 alunoId={id} alunoNome={resultadoAluno.dados.nome} alunoAtivo={resultadoAluno.dados.ativo} referencia={anterior ? referenciaV2DeAvaliacaoV1(anterior) : null} dataPadrao={hojeIsoSaoPaulo()} />;
}
