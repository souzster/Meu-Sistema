"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { formatarReais, paraCentavos } from "@/lib/dinheiro";
import "./metas.css";

type Meta = {
  id: string;
  nome: string;
  alvo: number;
  atual: number;
  prazo: string | null;
};

// "2026-12-31" -> "31/12/2026"
function formatarPrazo(data: string) {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Quantos meses faltam entre hoje e o prazo (no mínimo 1).
function mesesAte(prazo: string, hoje: string) {
  const [pa, pm] = prazo.split("-").map(Number);
  const [ha, hm] = hoje.split("-").map(Number);
  return Math.max(1, (pa - ha) * 12 + (pm - hm));
}

function descreverMeta(meta: Meta, hoje: string) {
  const falta = meta.alvo - meta.atual;
  if (falta <= 0) return "Meta atingida.";
  if (!meta.prazo) return `Faltam ${formatarReais(falta)}.`;
  if (meta.prazo < hoje) {
    return `Prazo vencido em ${formatarPrazo(meta.prazo)}. Faltam ${formatarReais(falta)}.`;
  }
  const porMes = Math.ceil(falta / mesesAte(meta.prazo, hoje));
  return `Faltam ${formatarReais(falta)} até ${formatarPrazo(meta.prazo)} · cerca de ${formatarReais(porMes)} por mês.`;
}

export default function Metas({
  workspaceId,
  hoje,
  metas,
}: {
  workspaceId: string;
  hoje: string;
  metas: Meta[];
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [alvo, setAlvo] = useState("");
  const [prazo, setPrazo] = useState("");
  const [jaGuardado, setJaGuardado] = useState("");
  const [erro, setErro] = useState("");
  const [depositos, setDepositos] = useState<Record<string, string>>({});
  const [erroLista, setErroLista] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function criarMeta(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");

    if (!nome.trim()) {
      setErro("Dê um nome para a meta.");
      return;
    }
    const alvoCentavos = paraCentavos(alvo);
    if (alvoCentavos === null || alvoCentavos <= 0) {
      setErro("Informe o valor da meta, como 10.000,00.");
      return;
    }
    const atualCentavos =
      jaGuardado.trim() === "" ? 0 : paraCentavos(jaGuardado);
    if (atualCentavos === null) {
      setErro("O valor já guardado não é válido. Use algo como 500,00.");
      return;
    }

    setOcupado(true);
    const supabase = criarClienteNavegador();
    const { error } = await supabase.from("goals").insert({
      workspace_id: workspaceId,
      nome: nome.trim(),
      valor_alvo_centavos: alvoCentavos,
      valor_atual_centavos: atualCentavos,
      prazo: prazo || null,
    });
    setOcupado(false);

    if (error) {
      setErro("Não foi possível salvar a meta. Tente de novo.");
      return;
    }

    setNome("");
    setAlvo("");
    setPrazo("");
    setJaGuardado("");
    router.refresh();
  }

  // sinal = 1 para guardar, -1 para retirar
  async function movimentar(meta: Meta, sinal: 1 | -1) {
    setErroLista("");
    const centavos = paraCentavos(depositos[meta.id] ?? "");
    if (centavos === null || centavos <= 0) {
      setErroLista("Informe um valor válido, como 200,00.");
      return;
    }

    setOcupado(true);
    const supabase = criarClienteNavegador();
    const { error } = await supabase
      .from("goals")
      .update({ valor_atual_centavos: Math.max(0, meta.atual + sinal * centavos) })
      .eq("id", meta.id);
    setOcupado(false);

    if (error) {
      setErroLista("Não foi possível atualizar a meta. Tente de novo.");
      return;
    }

    setDepositos({ ...depositos, [meta.id]: "" });
    router.refresh();
  }

  async function apagar(meta: Meta) {
    if (!window.confirm(`Apagar a meta "${meta.nome}"?`)) return;

    setOcupado(true);
    const supabase = criarClienteNavegador();
    const { error } = await supabase.from("goals").delete().eq("id", meta.id);
    setOcupado(false);

    if (error) {
      setErroLista("Não foi possível apagar a meta. Tente de novo.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="metas">
      {metas.length === 0 ? (
        <p className="vazio">Nenhuma meta cadastrada ainda.</p>
      ) : (
        <ul className="meta-lista">
          {metas.map((meta) => {
            const pct =
              meta.alvo > 0
                ? Math.min(100, Math.floor((meta.atual * 100) / meta.alvo))
                : 0;
            return (
              <li key={meta.id} className="meta">
                <div className="meta-topo">
                  <strong>{meta.nome}</strong>
                  <button
                    className="botao-apagar"
                    type="button"
                    onClick={() => apagar(meta)}
                    disabled={ocupado}
                    aria-label={`Apagar a meta ${meta.nome}`}
                  >
                    Apagar
                  </button>
                </div>

                <div
                  className="meta-barra"
                  role="progressbar"
                  aria-label={`Progresso da meta ${meta.nome}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                >
                  <div className="meta-cheia" style={{ width: `${pct}%` }} />
                </div>

                <p className="meta-valores">
                  {formatarReais(meta.atual)} de {formatarReais(meta.alvo)} ({pct}
                  %)
                </p>
                <p className="meta-info">{descreverMeta(meta, hoje)}</p>

                <div className="meta-acoes">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Valor, ex.: 200,00"
                    aria-label={`Valor para guardar ou retirar da meta ${meta.nome}`}
                    value={depositos[meta.id] ?? ""}
                    onChange={(e) =>
                      setDepositos({ ...depositos, [meta.id]: e.target.value })
                    }
                  />
                  <button
                    className="botao"
                    type="button"
                    onClick={() => movimentar(meta, 1)}
                    disabled={ocupado}
                  >
                    Guardar
                  </button>
                  <button
                    className="botao-apagar"
                    type="button"
                    onClick={() => movimentar(meta, -1)}
                    disabled={ocupado}
                  >
                    Retirar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {erroLista && (
        <p className="erro" role="alert">
          {erroLista}
        </p>
      )}

      <h3 className="meta-titulo-form">Nova meta</h3>
      <form className="form-lancamento" onSubmit={criarMeta}>
        <div className="campo campo-largo">
          <label htmlFor="meta-nome">Nome da meta</label>
          <input
            id="meta-nome"
            type="text"
            placeholder="Reserva de emergência, viagem..."
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="meta-alvo">Valor da meta (R$)</label>
          <input
            id="meta-alvo"
            type="text"
            inputMode="decimal"
            placeholder="10.000,00"
            value={alvo}
            onChange={(e) => setAlvo(e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="meta-guardado">Já guardado (opcional)</label>
          <input
            id="meta-guardado"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={jaGuardado}
            onChange={(e) => setJaGuardado(e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="meta-prazo">Prazo (opcional)</label>
          <input
            id="meta-prazo"
            type="date"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
          />
        </div>

        {erro && (
          <p className="erro campo-largo" role="alert">
            {erro}
          </p>
        )}

        <div className="campo-largo">
          <button className="botao" type="submit" disabled={ocupado}>
            {ocupado ? "Salvando..." : "Criar meta"}
          </button>
        </div>
      </form>
    </div>
  );
}