import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Roda antes das páginas: renova a sessão e bloqueia quem não está logado.
export async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesParaGravar) {
          cookiesParaGravar.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          resposta = NextResponse.next({ request });
          cookiesParaGravar.forEach(({ name, value, options }) =>
            resposta.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() confirma o login no servidor do Supabase (mais seguro que getSession).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rota = request.nextUrl.pathname;

  if (!user && rota.startsWith("/painel")) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }

  if (user && rota === "/entrar") {
    return NextResponse.redirect(new URL("/painel", request.url));
  }

  return resposta;
}

export const config = {
  matcher: ["/painel/:path*", "/entrar"],
};