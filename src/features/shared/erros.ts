/**
 * Traduz status HTTP em mensagem amigavel, em portugues acentuado.
 * Nunca exibir o campo `error` cru da API (ver frontend-plan.md 4.7).
 */
export function mensagemDoErro(status: number): string {
  switch (status) {
    case 0:
      return "Não foi possível conectar ao servidor. Verifique sua conexão.";
    case 400:
      return "A solicitação não pôde ser processada.";
    case 404:
      return "Registro não encontrado.";
    case 409:
      return "Já existe um registro com esses dados.";
    case 422:
      return "Os dados enviados são inválidos.";
    default:
      return "Ocorreu um erro interno. Tente novamente.";
  }
}
