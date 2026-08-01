"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";

import { Button } from "@/components/ui/button";

const ID_BOTAO_CANCELAR = "confirm-dialog-cancelar";

type ConfirmDialogProps = {
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
  titulo: string;
  descricao: string;
  rotuloConfirmar: string;
  aoConfirmar: () => void;
  pendente: boolean;
  erro: string | null;
};

/**
 * Construido direto sobre @base-ui/react/alert-dialog (nunca o registro do
 * shadcn: sobrescreveria button.tsx e apagaria o fix de foco do U1). O
 * AlertDialog do Base UI ja e sempre modal e nao fecha por clique fora —
 * semantica correta pra confirmacao destrutiva (e4-implementation-spec.md 12.3).
 *
 * `bg-background` e explicito porque `--popover` nao existe (2.6): o registro
 * usaria `bg-popover` e o dialogo sairia transparente sobre a pagina.
 */
export function ConfirmDialog({
  aberto,
  aoMudarAberto,
  titulo,
  descricao,
  rotuloConfirmar,
  aoConfirmar,
  pendente,
  erro,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root
      open={aberto}
      onOpenChange={(novoAberto) => {
        // Escape e o Close nao fecham durante uma requisicao em andamento
        // (e4-implementation-spec.md 15).
        if (pendente && !novoAberto) return;
        aoMudarAberto(novoAberto);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-foreground/40" />
        <AlertDialog.Popup
          initialFocus={() => document.getElementById(ID_BOTAO_CANCELAR)}
          className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-current bg-background p-6 shadow-lg"
        >
          <AlertDialog.Title className="text-lg font-semibold">
            {titulo}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm">
            {descricao}
          </AlertDialog.Description>

          {erro ? (
            <p role="alert" className="mt-3 text-sm font-semibold">
              {erro}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Close
              disabled={pendente}
              render={
                <Button
                  id={ID_BOTAO_CANCELAR}
                  type="button"
                  variant="outline"
                  className="h-11 sm:h-9"
                >
                  Cancelar
                </Button>
              }
            />
            <Button
              type="button"
              variant="destructive"
              className="h-11 sm:h-9"
              disabled={pendente}
              onClick={aoConfirmar}
            >
              {pendente ? "Excluindo…" : rotuloConfirmar}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
