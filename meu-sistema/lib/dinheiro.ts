// Converte o que a pessoa digitou ("1.234,56", "1234,5", "R$ 12,00", "12.5")
// em centavos inteiros. Devolve null se não der para entender o valor.
// Não usa números decimais (float) na conta, então não há erro de arredondamento.
export function paraCentavos(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.]/g, "");
  if (!limpo) return null;

  let normalizado = limpo;
  if (limpo.includes(",")) {
    // Com vírgula: a vírgula é o decimal e os pontos são de milhar.
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (!/^\d+(\.\d{1,2})?$/.test(limpo)) {
    // Sem vírgula e com ponto de milhar: "1.234" = 1234 reais.
    normalizado = limpo.replace(/\./g, "");
  }

  const partes = normalizado.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!partes) return null;

  const reais = Number(partes[1]);
  const centavos = Number((partes[2] ?? "0").padEnd(2, "0"));
  return reais * 100 + centavos;
}

// Converte centavos do banco para texto em reais: 123456 -> "R$ 1.234,56".
export function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}