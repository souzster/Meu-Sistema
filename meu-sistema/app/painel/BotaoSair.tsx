"use client";

import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";

export default function BotaoSair() {
  const router = useRouter();

  async function sair() {
    const supabase = criarClienteNavegador();
    await supabase.auth.signOut();
    router.push("/entrar");
    router.refresh();
  }

  return (
    <button className="botao" type="button" onClick={sair}>
      Sair
    </button>
  );
}