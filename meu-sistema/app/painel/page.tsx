import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarReais } from "@/lib/dinheiro";
import BotaoSair from "./BotaoSair";
import BotaoApagar from "./BotaoApagar";
import FormLancamento from "./FormLancamento";
import OrcamentoMes from "./OrcamentoMes";
import Metas from "./Metas";
import "../auth.css";
import "./painel.css";

type Conta = { id: string; nome: string };
type Categoria = { id: string; nome: string; tipo: "receita" | "despesa" };
type Lancamento = {
  id: string;
  tipo: "receita" | "despesa";
  valor_centavos: number;
  data: string;
  descricao: string | null;
  account_id: string;
  category_id: string | null;
};
type Orcamento = { category_id: string; valor_centavos: number };
type MetaBanco = {
  id: string;
  nome: string;
  valor_alvo_centavos: number;
  valor_atual_centavos: number;
  prazo: string | null;
};

// "2026-11-19" -> "19/11"
function formatarData(data: string) {
  const [, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
}

async function ConteudoPainel() {
  // Esta parte roda a cada acesso, e não na pré-renderização.
  await connection();

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  // Data de hoje e limites do mês, no fuso de São Paulo.
  const hoje = new Date().toLocaleDateString("sv-SE", {
    timeZone: "America/Sao_Paulo",
  });
  const [ano, mes] = hoje.split("-").map(Number);
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const proximo =
    mes === 12
      ? `${ano + 1}-01-01`
      : `${ano}-${String(mes + 1).padStart(2, "0")}-01`;
  const rotuloMes = new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  // O espaço financeiro ao qual esta pessoa pertence.
  const { data: vinculo } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .limit(1)
    .maybeSingle();
  const workspaceId = (vinculo as { workspace_id: string } | null)
    ?.workspace_id;

  let conteudo: React.ReactNode;

  if (!workspaceId) {
    conteudo = (
      <p className="aviso">
        Este usuário ainda não está ligado a um espaço financeiro. Rode o
        script 02-espaco-e-usuarios.sql no Supabase.
      </p>
    );
  } else {
    const [contasR, categoriasR, lancamentosR, orcamentosR, metasR] =
      await Promise.all(
      [
        supabase.from("accounts").select("id, nome").order("nome"),
        supabase.from("categories").select("id, nome, tipo").order("nome"),
        supabase
          .from("transactions")
          .select(
            "id, tipo, valor_centavos, data, descricao, account_id, category_id",
          )
          .gte("data", inicio)
          .lt("data", proximo)
          .order("data", { ascending: false })
          .order("criado_em", { ascending: false }),
        // Orçamentos até o mês atual, do mais recente para o mais antigo.
        supabase
          .from("budgets")
          .select("category_id, valor_centavos")
          .lte("mes", inicio)
          .order("mes", { ascending: false }),
        supabase
          .from("goals")
          .select(
            "id, nome, valor_alvo_centavos, valor_atual_centavos, prazo",
          )
          .order("criado_em"),
      ],
    );

    const contas = (contasR.data ?? []) as unknown as Conta[];
    const categorias = (categoriasR.data ?? []) as unknown as Categoria[];
    const lancamentos = (lancamentosR.data ?? []) as unknown as Lancamento[];
    const orcamentos = (orcamentosR.data ?? []) as unknown as Orcamento[];
    const metas = ((metasR.data ?? []) as unknown as MetaBanco[]).map((m) => ({
      id: m.id,
      nome: m.nome,
      alvo: m.valor_alvo_centavos,
      atual: m.valor_atual_centavos,
      prazo: m.prazo,
    }));

    const nomeConta = new Map<string, string>(
      contas.map((c) => [c.id, c.nome] as [string, string]),
    );
    const nomeCategoria = new Map<string, string>(
      categorias.map((c) => [c.id, c.nome] as [string, string]),
    );

    const receitas = lancamentos
      .filter((l) => l.tipo === "receita")
      .reduce((soma, l) => soma + l.valor_centavos, 0);
    const despesas = lancamentos
      .filter((l) => l.tipo === "despesa")
      .reduce((soma, l) => soma + l.valor_centavos, 0);

    // Orçamento vale do mês em que foi definido em diante, até ser alterado.
    const orcadoPorCategoria = new Map<string, number>();
    for (const o of orcamentos) {
      if (!orcadoPorCategoria.has(o.category_id)) {
        orcadoPorCategoria.set(o.category_id, o.valor_centavos);
      }
    }

    const gastoPorCategoria = new Map<string, number>();
    let semCategoria = 0;
    for (const l of lancamentos) {
      if (l.tipo !== "despesa") continue;
      if (l.category_id) {
        gastoPorCategoria.set(
          l.category_id,
          (gastoPorCategoria.get(l.category_id) ?? 0) + l.valor_centavos,
        );
      } else {
        semCategoria += l.valor_centavos;
      }
    }

    const itensOrcamento = categorias
      .filter((c) => c.tipo === "despesa")
      .map((c) => ({
        id: c.id,
        nome: c.nome,
        orcado: orcadoPorCategoria.get(c.id) ?? null,
        gasto: gastoPorCategoria.get(c.id) ?? 0,
      }));

    conteudo = (
      <>
        <section className="resumo" aria-label="Resumo do mês">
          <div className="resumo-item">
            <span>Receitas</span>
            <strong>{formatarReais(receitas)}</strong>
          </div>
          <div className="resumo-item">
            <span>Despesas</span>
            <strong>{formatarReais(despesas)}</strong>
          </div>
          <div className="resumo-item resumo-destaque">
            <span>Resultado do mês</span>
            <strong>{formatarReais(receitas - despesas)}</strong>
          </div>
        </section>

        <section className="bloco">
          <h2>Novo lançamento</h2>
          {contas.length === 0 ? (
            <p className="aviso">
              Nenhuma conta cadastrada. Rode o script 03-conta-inicial.sql no
              Supabase.
            </p>
          ) : (
            <FormLancamento
              workspaceId={workspaceId}
              contas={contas}
              categorias={categorias}
              hoje={hoje}
            />
          )}
        </section>

        <section className="bloco">
          <h2>Orçamento do mês</h2>
          <OrcamentoMes
            key={itensOrcamento.map((i) => `${i.id}:${i.orcado}`).join("|")}
            workspaceId={workspaceId}
            mes={inicio}
            itens={itensOrcamento}
            semCategoria={semCategoria}
          />
        </section>

        <section className="bloco">
          <h2>Metas</h2>
          <Metas workspaceId={workspaceId} hoje={hoje} metas={metas} />
        </section>

        <section className="bloco">
          <h2>Lançamentos do mês</h2>
          {lancamentos.length === 0 ? (
            <p className="vazio">Nenhum lançamento neste mês ainda.</p>
          ) : (
            <ul className="lista">
              {lancamentos.map((l) => {
                const categoria = l.category_id
                  ? nomeCategoria.get(l.category_id)
                  : undefined;
                const conta = nomeConta.get(l.account_id);
                return (
                  <li key={l.id}>
                    <span className="lista-data">{formatarData(l.data)}</span>
                    <span className="lista-desc">
                      <strong>
                        {l.descricao ?? categoria ?? "Sem descrição"}
                      </strong>
                      <small>
                        {[categoria, conta].filter(Boolean).join(" · ")}
                      </small>
                    </span>
                    <span className="lista-valor">
                      {l.tipo === "receita" ? "+" : "-"}{" "}
                      {formatarReais(l.valor_centavos)}
                    </span>
                    <BotaoApagar id={l.id} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </>
    );
  }

  return (
    <main className="painel">
      <header className="painel-topo">
        <div>
          <h1>Painel financeiro</h1>
          <p className="mes">{rotuloMes}</p>
        </div>
        <BotaoSair />
      </header>

      {conteudo}

      <p className="rodape-painel">Você entrou como {user.email}.</p>
    </main>
  );
}

export default function Painel() {
  return (
    <Suspense fallback={<p className="painel">Carregando...</p>}>
      <ConteudoPainel />
    </Suspense>
  );
}