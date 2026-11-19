"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { criarClienteNavegador } from "@/lib/supabase/client";
import "../auth.css";

export default function Entrar() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    setCarregando(true);

    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setErro("E-mail ou senha incorretos.");
      setCarregando(false);
      return;
    }

    router.push("/painel");
    router.refresh();
  }

  return (
    <main className="auth">
      <form className="auth-caixa" onSubmit={entrar}>
        <h1>Área restrita</h1>

        <div className="campo">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            autoComplete="current-password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>

        {erro && (
          <p className="erro" role="alert">
            {erro}
          </p>
        )}

        <button className="botao" type="submit" disabled={carregando}>
          {carregando ? "Entrando..." : "Entrar"}
        </button>

        <Link className="voltar" href="/">
          Voltar ao cartão de visita
        </Link>
      </form>
    </main>
  );
}