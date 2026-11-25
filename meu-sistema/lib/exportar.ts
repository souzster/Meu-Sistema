import { criarClienteServidor } from "@/lib/supabase/server";

// Confere se há alguém logado (as rotas de exportação só servem a quem entrou).
export async function estaLogado() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user);
}

// Busca todas as linhas de uma tabela, em blocos de 1000
// (o Supabase devolve no máximo 1000 por consulta).
export async function buscarTudo(tabela: string, ordem: string) {
  const supabase = await criarClienteServidor();
  const linhas: Record<string, unknown>[] = [];

  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from(tabela)
      .select("*")
      .order(ordem)
      .order("id")
      .range(de, de + 999);

    if (error) throw error;

    const bloco = (data ?? []) as unknown as Record<string, unknown>[];
    linhas.push(...bloco);
    if (bloco.length < 1000) break;
  }

  return linhas;
}

// Data de hoje (fuso de São Paulo) para o nome do arquivo.
export function dataParaArquivo() {
  return new Date().toLocaleDateString("sv-SE", {
    timeZone: "America/Sao_Paulo",
  });
}