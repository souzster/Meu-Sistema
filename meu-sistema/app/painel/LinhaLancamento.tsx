"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { formatarReais, paraCentavos } from "@/lib/dinheiro";
import BotaoApagar from "./BotaoApagar";

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

// "2026-11-19" -> "19/11"
function formatarData(data: string) {
  const [, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
}

export default function LinhaLancamento({
  lancamento: l,
  contas,
  categorias,
}: {
  lancamento: Lancamento;
  contas: Conta[];
  categorias: Categoria[];
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [tipo, setTipo] = useState<"receita" | "despesa">(l.tipo);
  const [valor, setValor] = useState("");
  const [data, setData] = useState(l.data);
  const [contaId, setContaId] = useState(l.account_id);
  const [categoriaId, setCategoriaId] = useState(l.category_id ?? "");
  const [descricao, setDescricao] = useState(l.descricao ?? "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const nomeCategoria = categorias.find((c) => c.id === l.category_id)?.nome;
  const nomeConta = contas.find((c) => c.id === l.account_id)?.nome;
  const categoriasDoTipo = categorias.filter((c) => c.tipo === tipo);

  // Ao abrir, o formulário sempre parte do que está salvo agora.
  function abrirEdicao() {
    setTipo(l.tipo);
    setValor((l.valor_centavos / 100).toFixed(2).replace(".", ","));
    setData(l.data);
    setContaId(l.account_id);
    setCategoriaId(l.category_id ?? "");
    setDescricao(l.descricao ?? "");
    setErro("");
    setEditando(true);
  }

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");

    const centavos = paraCentavos(valor);
    if (centavos === null || centavos <= 0) {
      setErro("Informe um valor válido, como 25,90.");
      return;
    }

    setSalvando(true);
    const supabase = criarClienteNavegador();
    const { error } = await supabase
      .from("transactions")
      .update({
        tipo,
        valor_centavos: centavos,
        data,
        account_id: contaId,
        category_id: categoriaId || null,
        descricao: descricao.trim() || null,
      })
      .eq("id", l.id);
    setSalvando(false);

    if (error) {
      setErro("Não foi possível salvar. Tente de novo.");
      return;
    }

    setEditando(false);
    router.refresh();
  }

  if (!editando) {
    return (
      <li>
        <span className="lista-data">{formatarData(l.data)}</span>
        <span className="lista-desc">
          <strong>{l.descricao ?? nomeCategoria ?? "Sem descrição"}</strong>
          <small>{[nomeCategoria, nomeConta].filter(Boolean).join(" · ")}</small>
        </span>
        <span className="lista-valor">
          {l.tipo === "receita" ? "+" : "-"} {formatarReais(l.valor_centavos)}
        </span>
        <span className="lista-acoes">
          <button
            className="botao-apagar"
            type="button"
            onClick={abrirEdicao}
            aria-label="Editar lançamento"
          >
            Editar
          </button>
          <BotaoApagar id={l.id} />
        </span>
      </li>
    );
  }

  return (
    <li className="lista-edicao">
      <form className="form-lancamento" onSubmit={salvar}>
        <div className="campo">
          <label htmlFor={`tipo-${l.id}`}>Tipo</label>
          <select
            id={`tipo-${l.id}`}
            value={tipo}
            onChange={(e) => {
              const novoTipo = e.target.value as "receita" | "despesa";
              setTipo(novoTipo);
              // Se a categoria escolhida não serve para o novo tipo, limpa.
              const atual = categorias.find((c) => c.id === categoriaId);
              if (atual && atual.tipo !== novoTipo) setCategoriaId("");
            }}
          >
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
        </div>

        <div className="campo">
          <label htmlFor={`valor-${l.id}`}>Valor (R$)</label>
          <input
            id={`valor-${l.id}`}
            type="text"
            inputMode="decimal"
            required
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor={`data-${l.id}`}>Data</label>
          <input
            id={`data-${l.id}`}
            type="date"
            required
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor={`conta-${l.id}`}>Conta</label>
          <select
            id={`conta-${l.id}`}
            value={contaId}
            onChange={(e) => setContaId(e.target.value)}
          >
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor={`categoria-${l.id}`}>Categoria</label>
          <select
            id={`categoria-${l.id}`}
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            <option value="">Sem categoria</option>
            {categoriasDoTipo.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="campo campo-largo">
          <label htmlFor={`descricao-${l.id}`}>Descrição (opcional)</label>
          <input
            id={`descricao-${l.id}`}
            type="text"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>

        {erro && (
          <p className="erro campo-largo" role="alert">
            {erro}
          </p>
        )}

        <div className="campo-largo lista-acoes">
          <button className="botao" type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar alterações"}
          </button>
          <button
            className="botao-apagar"
            type="button"
            onClick={() => setEditando(false)}
            disabled={salvando}
          >
            Cancelar
          </button>
        </div>
      </form>
    </li>
  );
}