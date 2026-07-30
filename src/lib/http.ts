import { ZodError, type ZodType } from "zod";

import { Prisma } from "@/generated/prisma/client";

/** Erro de dominio que vira uma resposta HTTP com o status escolhido. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Uso: `throw naoEncontrado("Aluno nao encontrado")`. */
export const naoEncontrado = (mensagem: string) => new ApiError(404, mensagem);

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

/** Le e valida o corpo JSON da requisicao. Lanca ZodError se invalido. */
export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    throw new ApiError(400, "Corpo da requisicao nao e um JSON valido");
  }

  return schema.parse(raw);
}

/** Valida os query params (?alunoId=...) da URL. */
export function parseQuery<T>(request: Request, schema: ZodType<T>): T {
  const params = new URL(request.url).searchParams;
  return schema.parse(Object.fromEntries(params));
}

function toErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return json({ error: error.message }, error.status);
  }

  if (error instanceof ZodError) {
    return json(
      {
        error: "Dados invalidos",
        issues: error.issues.map((issue) => ({
          field: issue.path.join(".") || "(raiz)",
          message: issue.message,
        })),
      },
      422,
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // https://www.prisma.io/docs/orm/reference/error-reference
    switch (error.code) {
      case "P2002":
        return json({ error: "Ja existe um registro com esses dados" }, 409);
      case "P2003":
        return json({ error: "Referencia para um registro inexistente" }, 422);
      case "P2025":
        return json({ error: "Registro nao encontrado" }, 404);
    }
  }

  console.error("[api] erro nao tratado:", error);
  return json({ error: "Erro interno" }, 500);
}

/**
 * Envolve um route handler traduzindo excecoes em respostas HTTP,
 * pros handlers so cuidarem do caminho feliz.
 */
export function handler<Args extends unknown[]>(
  fn: (request: Request, ...args: Args) => Promise<Response>,
) {
  return async (request: Request, ...args: Args): Promise<Response> => {
    try {
      return await fn(request, ...args);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
