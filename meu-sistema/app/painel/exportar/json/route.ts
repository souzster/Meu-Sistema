import { buscarTudo, dataParaArquivo, estaLogado } from "@/lib/exportar";

export async function GET() {
  if (!(await estaLogado())) {
    return new Response("Não autorizado", { status: 401 });
  }

  const [espacos, contas, categorias, lancamentos, orcamentos, metas] =
    await Promise.all([
      buscarTudo("workspaces", "criado_em"),
      buscarTudo("accounts", "criado_em"),
      buscarTudo("categories", "nome"),
      buscarTudo("transactions", "criado_em"),
      buscarTudo("budgets", "mes"),
      buscarTudo("goals", "criado_em"),
    ]);

  const dia = dataParaArquivo();
  const backup = {
    gerado_em: dia,
    observacao: "Valores em centavos. Datas no formato AAAA-MM-DD.",
    espacos,
    contas,
    categorias,
    lancamentos,
    orcamentos,
    metas,
  };

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="backup-${dia}.json"`,
      "Cache-Control": "no-store",
    },
  });
}