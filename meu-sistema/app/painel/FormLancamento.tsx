"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { paraCentavos } from "@/lib/dinheiro";

type Conta = { id: string; nome: string };
type Categoria = { id: string; nome: string; tipo: "receita" | "despesa" };

export default function FormLancamento({
  workspaceId,
  contas,
  categorias,
  hoje,
}: {
  workspaceId: string;
  contas: Conta[];
  categorias: Categoria[];
  hoje: string;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<"receita" | "despesa">("despesa");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hoje);
  const [contaId, setContaId] = useState(contas[0]?.id ?? "");
  const [categoriaId, setCategoriaId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const categoriasDoTipo = categorias.filter((c) => c.tipo === tipo);

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
    const { error } = await supabase.from("transactions").insert({
      workspace_id: workspaceId,
      account_id: contaId,
      category_id: categoriaId || null,
      tipo,
      valor_centavos: centavos,
      data,
      descricao: descricao.trim() || null,
    });
    setSalvando(false);

    if (error) {
      setErro("Não foi possível salvar. Tente de novo.");
      return;
    }

    setValor("");
    setDescricao("");
    router.refresh();
  }

  return (
    <form className="form-lancamento" onSubmit={salvar}>
      <div className="campo">
        <label htmlFor="tipo">Tipo</label>
        <select
          id="tipo"
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value as "receita" | "despesa");
            setCategoriaId("");
          }}
        >
          <option value="despesa">Despesa</option>
          <option value="receita">Receita</option>
        </select>
      </div>

      <div className="campo">
        <label htmlFor="valor">Valor (R$)</label>
        <input
          id="valor"
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          required
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
      </div>

      <div className="campo">
        <label htmlFor="data">Data</label>
        <input
          id="data"
          type="date"
          required
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
      </div>

      <div className="campo">
        <label htmlFor="conta">Conta</label>
        <select
          id="conta"
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
        <label htmlFor="categoria">Categoria</label>
        <select
          id="categoria"
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
        <label htmlFor="descricao">Descrição (opcional)</label>
        <input
          id="descricao"
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

      <div className="campo-largo">
        <button className="botao" type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar lançamento"}
        </button>
      </div>
    </form>
  );
}