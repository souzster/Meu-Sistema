import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarReais } from "@/lib/dinheiro";
import BotaoSair from "./BotaoSair";
import LinhaLancamento from "./LinhaLancamento";
import FormLancamento from "./FormLancamento";
import OrcamentoMes from "./OrcamentoMes";
import Metas from "./Metas";
import Contas from "./Contas";
import Categorias from "./Categorias";
import "../auth.css";
import "./painel.css";
import "./backup.css";

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
type SaldoConta = {
  account_id: string;
  nome: string;
  tipo: string;
  saldo_centavos: number;
};
type MetaBanco = {
  id: string;
  nome: string;
  valor_alvo_centavos: number;
  valor_atual_centavos: number;
  prazo: string | null;
};

type ParametrosPagina = Promise<Record<string, string | string[] | undefined>>;

// Soma (ou subtrai) meses e devolve no formato "2026-11".
function deslocarMes(ano: number, mes: number, delta: number) {
  const total = ano * 12 + (mes - 1) + delta;
  const novoAno = Math.floor(total / 12);
  const novoMes = (total % 12) + 1;
  return `${novoAno}-${String(novoMes).padStart(2, "0")}`;
}

async function ConteudoPainel({
  searchParams,
}: {
  searchParams: ParametrosPagina;
}) {
  // Esta parte roda a cada acesso, e não na pré-renderização.
  await connection();
  const parametros = await searchParams;

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
  const mesAtual = hoje.slice(0, 7);
  const pedido = Array.isArray(parametros.mes)
    ? parametros.mes[0]
    : parametros.mes;
  const mesEscolhido =
    pedido && /^\d{4}-(0[1-9]|1[0-2])$/.test(pedido) ? pedido : mesAtual;
  const [ano, mes] = mesEscolhido.split("-").map(Number);
  const inicio = `${mesEscolhido}-01`;
  const mesAnterior = deslocarMes(ano, mes, -1);
  const mesSeguinte = deslocarMes(ano, mes, 1);
  const proximo = `${mesSeguinte}-01`;
  const ehMesAtual = mesEscolhido === mesAtual;
  // Em outro mês, o formulário já abre com uma data dentro dele.
  const dataPadrao = ehMesAtual ? hoje : inicio;
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
    const [contasR, categoriasR, lancamentosR, orcamentosR, metasR, saldosR] =
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
        supabase
          .from("saldos_contas")
          .select("account_id, nome, tipo, saldo_centavos")
          .order("nome"),
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
    const saldosContas = ((saldosR.data ?? []) as unknown as SaldoConta[]).map(
      (c) => ({
        id: c.account_id,
        nome: c.nome,
        tipo: c.tipo,
        saldo: Number(c.saldo_centavos),
      }),
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
          <h2>Contas e saldos</h2>
          {saldosR.error ? (
            <p className="aviso">
              Não foi possível carregar os saldos. Rode o script
              04-saldos-contas.sql no Supabase.
            </p>
          ) : (
            <Contas workspaceId={workspaceId} contas={saldosContas} />
          )}
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
              key={inicio}
              workspaceId={workspaceId}
              contas={contas}
              categorias={categorias}
              hoje={dataPadrao}
            />
          )}
        </section>

        <section className="bloco">
          <h2>Orçamento do mês</h2>
          <OrcamentoMes
            key={`${inicio}|${itensOrcamento.map((i) => `${i.id}:${i.orcado}`).join("|")}`}
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
              {lancamentos.map((l) => (
                <LinhaLancamento
                  key={l.id}
                  lancamento={l}
                  contas={contas}
                  categorias={categorias}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="bloco">
          <details className="recolher">
            <summary>
              <h2>Categorias</h2>
            </summary>
            <Categorias workspaceId={workspaceId} categorias={categorias} />
          </details>
        </section>

        <section className="bloco">
          <details className="recolher">
            <summary>
              <h2>Backup e exportação</h2>
            </summary>
            <div className="backup">
              <p>
                Baixe uma cópia dos seus dados e guarde em um lugar seguro, como
                o Google Drive. O ideal é fazer isso uma vez por mês.
              </p>
              <p className="backup-links">
                <a className="botao" href="/painel/exportar/csv">
                  Planilha de lançamentos (CSV)
                </a>
                <a className="botao botao-claro" href="/painel/exportar/json">
                  Backup completo (JSON)
                </a>
              </p>
            </div>
          </details>
        </section>
      </>
    );
  }

  return (
    <main className="painel">
      <header className="painel-topo">
        <div>
          <h1>Painel financeiro</h1>
          <nav className="nav-mes" aria-label="Navegar entre meses">
            <Link href={`/painel?mes=${mesAnterior}`}>← Anterior</Link>
            <span className="mes">{rotuloMes}</span>
            <Link href={`/painel?mes=${mesSeguinte}`}>Próximo →</Link>
            {!ehMesAtual && <Link href="/painel">Voltar ao mês atual</Link>}
          </nav>
        </div>
        <BotaoSair />
      </header>

      {conteudo}

      <p className="rodape-painel">Você entrou como {user.email}.</p>
    </main>
  );
}

export default function Painel({
  searchParams,
}: {
  searchParams: ParametrosPagina;
}) {
  return (
    <Suspense fallback={<p className="painel">Carregando...</p>}>
      <ConteudoPainel searchParams={searchParams} />
    </Suspense>
  );
}