import { Button } from "@/components/ui/button";

const MENSAGEM_PADRAO =
  "Não foi possível concluir a operação. Tente novamente.";

/**
 * Generico: nao conhece aluno, avaliacao ou qualquer outro dominio.
 * `mensagem` deve vir ja traduzida do chamador — nunca texto cru da API.
 */
export function ErrorState({
  titulo = "Algo deu errado",
  mensagem,
  aoTentarNovamente,
}: {
  titulo?: string;
  mensagem: string;
  aoTentarNovamente: () => void;
}) {
  const texto = mensagem.trim() ? mensagem : MENSAGEM_PADRAO;

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <p className="text-sm text-muted-foreground">{texto}</p>
      <Button onClick={aoTentarNovamente}>Tentar novamente</Button>
    </div>
  );
}
