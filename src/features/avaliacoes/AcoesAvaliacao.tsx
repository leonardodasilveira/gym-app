"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { excluirAvaliacao } from "@/features/avaliacoes/acoes";
import { mensagemDoErro } from "@/features/shared/erros";
import { formatarData } from "@/features/shared/formato";

type AcoesAvaliacaoProps = {
  avaliacaoId: string;
  alunoId: string;
  dataAvaliacao: string;
};

/**
 * Unica ilha Client da pagina de detalhe: so a exclusao precisa de estado e
 * de useRouter. O resto da tela e Server Component (e6-implementation-spec.md
 * §6.1).
 *
 * Navegacao pos-sucesso: `router.replace`, sem `router.refresh()`. A ficha
 * (`/alunos/[id]`) e rota dinamica sem cache de segmento (usa `headers()` via
 * origemAtual() e tem `loading.tsx`), entao o `replace` ja dispara roundtrip
 * ao servidor e le o estado atualizado — um `refresh()` aqui atualizaria a
 * rota que esta sendo abandonada, nao o destino (spec §17.2-17.3). `replace`
 * em vez de `push` porque a entrada de historico atual aponta pra uma
 * avaliacao que deixou de existir; com `push` o botao Voltar cairia num 404.
 */
export function AcoesAvaliacao({
  avaliacaoId,
  alunoId,
  dataAvaliacao,
}: AcoesAvaliacaoProps) {
  const router = useRouter();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  async function confirmarExclusao() {
    if (excluindo) return;
    setExcluindo(true);
    setErroExclusao(null);

    const resultado = await excluirAvaliacao(avaliacaoId);

    if (!resultado.ok) {
      // 404 = a avaliacao ja nao existe: o estado desejado (fora do sistema)
      // ja foi alcancado, entao navega igual a um sucesso.
      if (resultado.erro.status !== 404) {
        setErroExclusao(mensagemDoErro(resultado.erro.status));
        setExcluindo(false);
        return;
      }
    }

    setDialogAberto(false);
    router.replace(`/alunos/${alunoId}`);
  }

  return (
    <div className="mt-8">
      <Button
        type="button"
        variant="destructive"
        className="h-11 sm:h-9"
        onClick={() => setDialogAberto(true)}
      >
        Excluir avaliação
      </Button>

      <ConfirmDialog
        aberto={dialogAberto}
        aoMudarAberto={setDialogAberto}
        titulo="Excluir esta avaliação?"
        descricao={`Isso remove a avaliação de ${formatarData(dataAvaliacao)}, com todas as medidas de amplitude, resultados de salto e resultados de velocidade. Esta ação não pode ser desfeita.`}
        rotuloConfirmar="Excluir avaliação"
        aoConfirmar={confirmarExclusao}
        pendente={excluindo}
        erro={erroExclusao}
      />
    </div>
  );
}
