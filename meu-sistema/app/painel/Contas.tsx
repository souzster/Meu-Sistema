"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { formatarReais, paraCentavos } from "@/lib/dinheiro";
import "./contas.css";

type ContaSaldo = { id: string; nome: string; tipo: string; saldo: number };

const TIPOS: Record<string, string> = {
  corrente: "Conta corrente",
  poupanca: "Poupança",
  cartao: "Cartão de crédito",
  dinheiro: "Dinheiro",
  investimento: "Investimento",
};

export default function Contas({
  workspaceId,
  contas,
}: {
  workspaceId: string;
  contas: ContaSaldo[];
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("corrente");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const total = contas.reduce((soma, c) => soma + c.saldo, 0);

  async function criar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");

    if (!nome.trim()) {
      setErro("Dê um nome para a conta.");
      return;
    }
    const inicial = saldoInicial.trim() === "" ? 0 : paraCentavos(saldoInicial);
    if (inicial === null) {
      setErro("O saldo inicial não é válido. Use algo como 1.500,00.");
      return;
    }

    setOcupado(true);
    const supabase = criarClienteNavegador();
    const { error } = await supabase.from("accounts").insert({
      workspace_id: workspaceId,
      nome: nome.trim(),
      tipo,
      saldo_inicial_centavos: inicial,
    });
    setOcupado(false);

    if (error) {
      setErro("Não foi possível criar a conta. Tente de novo.");
      return;
    }

    setNome("");
    setSaldoInicial("");
    router.refresh();
  }

  async function apagar(conta: ContaSaldo) {
    if (!window.confirm(`Apagar a conta "${conta.nome}"?`)) return;

    setErro("");
    setOcupado(true);
    const supabase = criarClienteNavegador();
    const { error } = await supabase
      .from("accounts")
      .delete()
      .eq("id", conta.id);
    setOcupado(false);

    if (error) {
      setErro(
        error.code === "23503"
          ? "Esta conta tem lançamentos e não pode ser apagada."
          : "Não foi possível apagar a conta. Tente de novo.",
      );
      return;
    }

    router.refresh();
  }

  return (
    <div className="contas">
      <p className="conta-total">
        Saldo total: <strong>{formatarReais(total)}</strong>
      </p>

      {contas.length > 0 && (
        <ul className="conta-lista">
          {contas.map((c) => (
            <li key={c.id} className="conta">
              <span className="conta-nome">
                <strong>{c.nome}</strong>
                <small>{TIPOS[c.tipo] ?? c.tipo}</small>
              </span>
              <span className="conta-saldo">{formatarReais(c.saldo)}</span>
              <button
                className="botao-apagar"
                type="button"
                onClick={() => apagar(c)}
                disabled={ocupado}
                aria-label={`Apagar a conta ${c.nome}`}
              >
                Apagar
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3 className="conta-titulo-form">Nova conta</h3>
      <form className="form-lancamento" onSubmit={criar}>
        <div className="campo">
          <label htmlFor="conta-nome">Nome</label>
          <input
            id="conta-nome"
            type="text"
            placeholder="Banco, carteira, cartão..."
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="conta-tipo">Tipo</label>
          <select
            id="conta-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            {Object.entries(TIPOS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="conta-saldo">Saldo inicial (opcional)</label>
          <input
            id="conta-saldo"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={saldoInicial}
            onChange={(e) => setSaldoInicial(e.target.value)}
          />
        </div>

        {erro && (
          <p className="erro campo-largo" role="alert">
            {erro}
          </p>
        )}

        <div className="campo-largo">
          <button className="botao" type="submit" disabled={ocupado}>
            {ocupado ? "Salvando..." : "Criar conta"}
          </button>
        </div>
      </form>
    </div>
  );
}