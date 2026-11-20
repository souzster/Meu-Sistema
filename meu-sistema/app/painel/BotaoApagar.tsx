"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";

export default function BotaoApagar({ id }: { id: string }) {
  const router = useRouter();
  const [apagando, setApagando] = useState(false);

  async function apagar() {
    if (!window.confirm("Apagar este lançamento?")) return;

    setApagando(true);
    const supabase = criarClienteNavegador();
    const { error } = await supabase.from("transactions").delete().eq("id", id);

    if (error) {
      setApagando(false);
      window.alert("Não foi possível apagar. Tente de novo.");
      return;
    }

    router.refresh();
  }

  return (
    <button
      className="botao-apagar"
      type="button"
      onClick={apagar}
      disabled={apagando}
      aria-label="Apagar lançamento"
    >
      Apagar
    </button>
  );
}