"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";
import "./categorias.css";

type Categoria = { id: string; nome: string; tipo: "receita" | "despesa" };

export default function Categorias({
  workspaceId,
  categorias,
}: {
  workspaceId: string;
  categorias: Categoria[];
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"receita" | "despesa">("despesa");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function criar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");

    if (!nome.trim()) {
      setErro("Dê um nome para a categoria.");
      return;
    }

    setOcupado(true);
    const supabase = criarClienteNavegador();
    const { error } = await supabase.from("categories").insert({
      workspace_id: workspaceId,
      nome: nome.trim(),
      tipo,
    });
    setOcupado(false);

    if (error) {
      setErro(
        error.code === "23505"
          ? "Já existe uma categoria com esse nome."
          : "Não foi possível criar a categoria. Tente de novo.",
      );
      return;
    }

    setNome("");
    router.refresh();
  }

  async function renomear(categoria: Categoria) {
    const resposta = window.prompt("Novo nome da categoria:", categoria.nome);
    if (resposta === null) return;

    const novoNome = resposta.trim();
    if (!novoNome || novoNome === categoria.nome) return;

    setErro("");
    setOcupado(true);
    const supabase = criarClienteNavegador();
    const { error } = await supabase
      .from("categories")
      .update({ nome: novoNome })
      .eq("id", categoria.id);
    setOcupado(false);

    if (error) {
      setErro(
        error.code === "23505"
          ? "Já existe uma categoria com esse nome."
          : "Não foi possível renomear. Tente de novo.",
      );
      return;
    }

    router.refresh();
  }

  async function apagar(categoria: Categoria) {
    if (!window.confirm(`Apagar a categoria "${categoria.nome}"?`)) return;

    setErro("");
    setOcupado(true);
    const supabase = criarClienteNavegador();
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoria.id);
    setOcupado(false);

    if (error) {
      setErro(
        error.code === "23503"
          ? "Esta categoria já tem lançamentos ou orçamento e não pode ser apagada. Renomeie-a, se preferir."
          : "Não foi possível apagar a categoria. Tente de novo.",
      );
      return;
    }

    router.refresh();
  }

  return (
    <div className="categorias">
      {(["despesa", "receita"] as const).map((grupo) => {
        const doGrupo = categorias.filter((c) => c.tipo === grupo);
        return (
          <div key={grupo}>
            <h3 className="cat-titulo">
              {grupo === "despesa" ? "Despesas" : "Receitas"}
            </h3>
            {doGrupo.length === 0 ? (
              <p className="vazio">Nenhuma categoria.</p>
            ) : (
              <ul className="cat-lista">
                {doGrupo.map((c) => (
                  <li key={c.id} className="cat">
                    <span className="cat-nome">{c.nome}</span>
                    <span className="lista-acoes">
                      <button
                        className="botao-apagar"
                        type="button"
                        onClick={() => renomear(c)}
                        disabled={ocupado}
                        aria-label={`Renomear a categoria ${c.nome}`}
                      >
                        Renomear
                      </button>
                      <button
                        className="botao-apagar"
                        type="button"
                        onClick={() => apagar(c)}
                        disabled={ocupado}
                        aria-label={`Apagar a categoria ${c.nome}`}
                      >
                        Apagar
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}

      <h3 className="cat-titulo">Nova categoria</h3>
      <form className="form-lancamento" onSubmit={criar}>
        <div className="campo">
          <label htmlFor="cat-nome">Nome</label>
          <input
            id="cat-nome"
            type="text"
            placeholder="Pets, Assinaturas..."
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="cat-tipo">Tipo</label>
          <select
            id="cat-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as "receita" | "despesa")}
          >
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
        </div>

        <div className="campo-largo">
          <button className="botao" type="submit" disabled={ocupado}>
            {ocupado ? "Salvando..." : "Criar categoria"}
          </button>
        </div>
      </form>
    </div>
  );
}