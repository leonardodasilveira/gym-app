/**
 * Formata um valor que pode ser nulo, oferecendo alternativa textual para
 * tecnologia assistiva quando ausente. Visualmente sempre mostra o texto
 * formatado (o traco, no caso de null); o texto alternativo fica so-leitor
 * de tela, e o traco fica oculto de tecnologia assistiva para nao anunciar
 * so "traco" sem contexto.
 *
 * Generico: nao sabe se o valor e uma medida, um delta ou outra coisa —
 * recebe o valor cru e a funcao de formatacao, nunca decide o texto sozinho.
 */
export function ValorOuAusente({
  valor,
  formatar,
  textoAusente = "não medido",
}: {
  valor: number | null;
  formatar: (valor: number | null) => string;
  textoAusente?: string;
}) {
  const texto = formatar(valor);

  if (valor !== null) {
    return <>{texto}</>;
  }

  return (
    <span>
      <span aria-hidden="true">{texto}</span>
      <span className="sr-only">{textoAusente}</span>
    </span>
  );
}
