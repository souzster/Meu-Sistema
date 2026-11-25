import { formatarReais } from "@/lib/dinheiro";
import "./graficos.css";

type Fatia = { nome: string; valor: number };
type MesResumo = { rotulo: string; receitas: number; despesas: number };

export default function Graficos({
  fatias,
  totalDespesas,
  meses,
}: {
  fatias: Fatia[];
  totalDespesas: number;
  meses: MesResumo[] | null;
}) {
  const maiorFatia = Math.max(1, ...fatias.map((f) => f.valor));
  const maiorMes = Math.max(
    1,
    ...(meses ?? []).flatMap((m) => [m.receitas, m.despesas]),
  );

  return (
    <div className="graficos">
      <div className="grafico">
        <h3>Despesas por categoria</h3>
        {fatias.length === 0 ? (
          <p className="vazio">Nenhuma despesa neste mês.</p>
        ) : (
          <ul className="barras">
            {fatias.map((f) => (
              <li key={f.nome}>
                <div className="barra-linha">
                  <span>{f.nome}</span>
                  <span>
                    {formatarReais(f.valor)} ·{" "}
                    {Math.round((f.valor * 100) / totalDespesas)}%
                  </span>
                </div>
                <div className="barra-trilho" aria-hidden="true">
                  <div
                    className="barra-valor"
                    style={{ width: `${(f.valor / maiorFatia) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grafico">
        <h3>Receitas e despesas nos últimos 6 meses</h3>
        {meses === null ? (
          <p className="aviso">
            Não foi possível carregar o histórico. Rode o script
            05-resumo-mensal.sql no Supabase.
          </p>
        ) : (
          <ul className="barras">
            {meses.map((m) => (
              <li key={m.rotulo}>
                <p className="barra-mes">{m.rotulo}</p>
                <div className="barra-linha">
                  <span>Receitas</span>
                  <span>{formatarReais(m.receitas)}</span>
                </div>
                <div className="barra-trilho" aria-hidden="true">
                  <div
                    className="barra-valor"
                    style={{ width: `${(m.receitas / maiorMes) * 100}%` }}
                  />
                </div>
                <div className="barra-linha">
                  <span>Despesas</span>
                  <span>{formatarReais(m.despesas)}</span>
                </div>
                <div className="barra-trilho" aria-hidden="true">
                  <div
                    className="barra-valor barra-despesa"
                    style={{ width: `${(m.despesas / maiorMes) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}