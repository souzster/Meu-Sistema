import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import BotaoSair from "./BotaoSair";
import "../auth.css";

async function ConteudoPainel() {
  // Garante que esta parte roda a cada acesso, e não na pré-renderização.
  await connection();

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  return (
    <main className="painel">
      <header className="painel-topo">
        <h1>Painel financeiro</h1>
        <BotaoSair />
      </header>

      <p>Você entrou como {user.email}.</p>
      <p>Em breve: lançamentos, orçamento mensal e metas.</p>
    </main>
  );
}

export default function Painel() {
  return (
    <Suspense fallback={<p className="painel">Carregando...</p>}>
      <ConteudoPainel />
    </Suspense>
  );
}