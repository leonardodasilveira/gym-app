"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { alternarAtivo, excluirAluno } from "@/features/alunos/acoes";
import { mensagemDoErro } from "@/features/shared/erros";

type AcoesAlunoProps = {
  aluno: { id: string; nome: string; ativo: boolean };
  totalAvaliacoes: number;
};

function descricaoExclusao(totalAvaliacoes: number): string {
  if (totalAvaliacoes === 0) {
    return "Este aluno não tem avaliações registradas. Esta ação não pode ser desfeita.";
  }
  if (totalAvaliacoes === 1) {
    return "Isso também exclui 1 avaliação, com todas as medidas e testes. Esta ação não pode ser desfeita.";
  }
  return `Isso também exclui ${totalAvaliacoes} avaliações, com todas as medidas e testes. Esta ação não pode ser desfeita.`;
}

/**
 * Barra de ações da ficha: editar, inativar/reativar (e4-implementation-spec.md
 * 9) e excluir com confirmação e impacto declarado (10).
 */
export function AcoesAluno({ aluno, totalAvaliacoes }: AcoesAlunoProps) {
  const router = useRouter();
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [dialogAberto, setDialogAberto] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  async function alternarStatus() {
    setPendente(true);
    setErro(null);

    const resultado = await alternarAtivo(aluno.id, !aluno.ativo);

    if (!resultado.ok) {
      setErro(mensagemDoErro(resultado.erro.status));
      setPendente(false);
      return;
    }

    router.refresh();
    setPendente(false);
  }

  async function confirmarExclusao() {
    if (excluindo) return;
    setExcluindo(true);
    setErroExclusao(null);

    const resultado = await excluirAluno(aluno.id);

    if (!resultado.ok) {
      // 404 = o registro ja nao existe: o estado desejado (aluno fora do
      // sistema) ja foi alcancado, entao navega igual a um sucesso (10.3).
      if (resultado.erro.status !== 404) {
        setErroExclusao(mensagemDoErro(resultado.erro.status));
        setExcluindo(false);
        return;
      }
    }

    setDialogAberto(false);
    router.refresh();
    router.push("/alunos");
  }

  const rotulo = aluno.ativo ? "Inativar aluno" : "Reativar aluno";
  const rotuloPendente = aluno.ativo ? "Inativando…" : "Reativando…";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="h-11 sm:h-9"
            render={<Link href={`/alunos/${aluno.id}/editar`}>Editar aluno</Link>}
          />
          <Button
            type="button"
            variant="outline"
            className="h-11 sm:h-9"
            disabled={pendente}
            onClick={alternarStatus}
          >
            {pendente ? rotuloPendente : rotulo}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {`Um aluno inativo continua no sistema, com avaliações e relatório intactos — some apenas do filtro "Ativos".`}
        </p>
        {erro ? (
          <p role="alert" className="text-sm font-semibold text-foreground">
            {erro}
          </p>
        ) : null}
      </div>

      <div>
        <Button
          type="button"
          variant="destructive"
          className="h-11 sm:h-9"
          onClick={() => setDialogAberto(true)}
        >
          Excluir aluno
        </Button>
      </div>

      <ConfirmDialog
        aberto={dialogAberto}
        aoMudarAberto={setDialogAberto}
        titulo={`Excluir ${aluno.nome}?`}
        descricao={descricaoExclusao(totalAvaliacoes)}
        rotuloConfirmar="Excluir aluno"
        aoConfirmar={confirmarExclusao}
        pendente={excluindo}
        erro={erroExclusao}
      />
    </div>
  );
}
