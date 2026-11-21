"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { formatarReais, paraCentavos } from "@/lib/dinheiro";
import "./orcamento.css";

type Item = { id: string; nome: string; orcado: number | null; gasto: number };

// 150000 -> "1500,00" (só para preencher o campo; vazio se não há orçamento)
function paraTexto(centavos: number | null) {
  if (!centavos) return "";
  return (centavos / 100).toFixed(2).replace(".", ",");
}

export default function OrcamentoMes({
  workspaceId,
  mes,
  itens,
  semCategoria,
}: {
  workspaceId: string;
  mes: string;
  itens: Item[];
  semCategoria: number;
}) {
  const router = useRouter();
  const [valores, setValores] = useState<Record<string, string>>(
    Object.fromEntries(itens.map((i) => [i.id, paraTexto(i.orcado)])),
  );
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const totalOrcado = itens.reduce((soma, i) => soma + (i.orcado ?? 0), 0);
  const totalGasto = itens.reduce((soma, i) => soma + i.gasto, 0) + semCategoria;

  async function salvar() {
    setErro("");

    const alteracoes: {
      workspace_id: string;
      category_id: string;
      mes: string;
      valor_centavos: number;
    }[] = [];

    for (const item of itens) {
      const texto = (valores[item.id] ?? "").trim();
      let centavos: number;

      if (texto === "") {
        // Campo vazio: se havia orçamento, passa a ser "sem orçamento" (0).
        if (!item.orcado) continue;
        centavos = 0;
      } else {
        const lido = paraCentavos(texto);
        if (lido === null) {
          setErro(`Valor inválido em ${item.nome}. Use algo como 500,00.`);
          return;
        }
        centavos = lido;
      }

      if (centavos === (item.orcado ?? 0)) continue;
      alteracoes.push({
        workspace_id: workspaceId,
        category_id: item.id,
        mes,
        valor_centavos: centavos,
      });
    }

    if (alteracoes.length === 0) return;

    setSalvando(true);
    const supabase = criarClienteNavegador();
    const { error } = await supabase
      .from("budgets")
      .upsert(alteracoes, { onConflict: "category_id,mes" });
    setSalvando(false);

    if (error) {
      setErro("Não foi possível salvar o orçamento. Tente de novo.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="orcamento">
      <ul className="orc-lista">
        {itens.map((item) => {
          const orcado = item.orcado ?? 0;
          const pct = orcado > 0 ? Math.round((item.gasto / orcado) * 100) : 0;
          const estourou = orcado > 0 && item.gasto > orcado;

          let texto = "Sem orçamento definido";
          if (orcado > 0) {
            texto = estourou
              ? `Gasto ${formatarReais(item.gasto)} de ${formatarReais(orcado)} · acima em ${formatarReais(item.gasto - orcado)}`
              : `Gasto ${formatarReais(item.gasto)} de ${formatarReais(orcado)} · restam ${formatarReais(orcado - item.gasto)}`;
          } else if (item.gasto > 0) {
            texto = `Gasto ${formatarReais(item.gasto)} · sem orçamento`;
          }

          return (
            <li key={item.id} className="orc-item">
              <div className="orc-topo">
                <label htmlFor={`orc-${item.id}`}>{item.nome}</label>
                <input
                  id={`orc-${item.id}`}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valores[item.id] ?? ""}
                  onChange={(e) =>
                    setValores({ ...valores, [item.id]: e.target.value })
                  }
                />
              </div>
              <div
                className="orc-barra"
                role="progressbar"
                aria-label={`Uso do orçamento de ${item.nome}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(pct, 100)}
              >
                <div
                  className={estourou ? "orc-cheia orc-estourou" : "orc-cheia"}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <p className="orc-texto">{texto}</p>
            </li>
          );
        })}
      </ul>

      {semCategoria > 0 && (
        <p className="orc-texto">
          Despesas sem categoria neste mês: {formatarReais(semCategoria)}
        </p>
      )}

      <div className="orc-rodape">
        <p>
          Total orçado: <strong>{formatarReais(totalOrcado)}</strong> · Despesas
          do mês: <strong>{formatarReais(totalGasto)}</strong>
        </p>
        <button
          className="botao"
          type="button"
          onClick={salvar}
          disabled={salvando}
        >
          {salvando ? "Salvando..." : "Salvar orçamento"}
        </button>
      </div>

      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}