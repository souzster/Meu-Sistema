import Link from "next/link";

// Edite apenas este bloco com os seus dados.
const dados = {
  nome: "Souza",
  profissao: "Agencia de teste",
  cidade: "Erechim, RS",
  resumo:
    "Em duas ou três frases: o que você faz, para quem faz e como pode ajudar quem chegou até aqui.",
  contatos: [
    {
      rotulo: "WhatsApp",
      texto: "(11) 90000-0000",
      href: "https://wa.me/5511900000000",
    },
    {
      rotulo: "E-mail",
      texto: "voce@email.com",
      href: "mailto:voce@email.com",
    },
    {
      rotulo: "LinkedIn",
      texto: "linkedin.com/in/seu-perfil",
      href: "https://linkedin.com/in/seu-perfil",
    },
    {
      rotulo: "Instagram",
      texto: "@seuperfil",
      href: "https://instagram.com/seuperfil",
    },
  ],
};

export default function Home() {
  return (
    <main className="pagina">
      <section className="cartao" aria-labelledby="nome">
        <div className="cartao-topo">
          <h1 id="nome">{dados.nome}</h1>
          <p className="profissao">{dados.profissao}</p>
        </div>
        <p className="cidade">{dados.cidade}</p>
      </section>

      <section className="conteudo">
        <p className="resumo">{dados.resumo}</p>

        <ul className="contatos">
          {dados.contatos.map((c) => (
            <li key={c.rotulo}>
              <a href={c.href} target="_blank" rel="noopener noreferrer">
                <span className="contato-rotulo">{c.rotulo}</span>
                <span className="contato-texto">{c.texto}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <footer className="rodape">
        <Link href="/entrar">Área restrita</Link>
      </footer>
    </main>
  );
}
