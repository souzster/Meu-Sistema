import { buscarTudo, dataParaArquivo, estaLogado } from "@/lib/exportar";

// Uma célula do CSV. Textos que começam com =, +, -, @ ganham um apóstrofo
// para a planilha não tratá-los como fórmula.
function celula(valor: unknown) {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  const seguro = /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
  return /[;"\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

// 123456 -> "1234,56"
function reais(centavos: unknown) {
  return (Number(centavos) / 100).toFixed(2).replace(".", ",");
}

export async function GET() {
  if (!(await estaLogado())) {
    return new Response("Não autorizado", { status: 401 });
  }

  const [lancamentos, contas, categorias] = await Promise.all([
    buscarTudo("transactions", "data"),
    buscarTudo("accounts", "nome"),
    buscarTudo("categories", "nome"),
  ]);

  const nomeConta = new Map(contas.map((c) => [c.id, c.nome]));
  const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome]));

  const linhas = [
    ["Data", "Tipo", "Valor", "Conta", "Categoria", "Descrição"].join(";"),
    ...lancamentos.map((l) =>
      [
        l.data,
        l.tipo === "receita" ? "Receita" : "Despesa",
        reais(l.valor_centavos),
        nomeConta.get(l.account_id),
        nomeCategoria.get(l.category_id),
        l.descricao,
      ]
        .map(celula)
        .join(";"),
    ),
  ];

  // O BOM no início faz o Excel abrir os acentos corretamente.
  return new Response("\uFEFF" + linhas.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lancamentos-${dataParaArquivo()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}