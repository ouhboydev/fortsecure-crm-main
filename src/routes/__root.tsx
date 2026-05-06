import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-background">
      <div className="max-w-md text-center bg-card rounded-lg border border-border p-12">
        <h1 className="text-8xl font-black text-primary tracking-tighter italic">404</h1>
        <h2 className="mt-6 text-xl font-bold text-foreground uppercase tracking-wider">Perda de Conexão</h2>
        <p className="mt-2 text-xs text-muted-foreground uppercase tracking-widest leading-relaxed">
          A rota solicitada não foi mapeada no painel comercial.
        </p>
        <div className="mt-10">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-xs font-bold text-primary-foreground uppercase tracking-widest hover:bg-primary/90 transition-colors"
          >
            Retornar ao Início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FortSecure — Command Center" },
      { name: "description", content: "Plataforma de gestão comercial com dashboards em tempo real, ranking, gamificação, modo TV e IA." },
      { name: "author", content: "FortSecure" },
      { property: "og:title", content: "FortSecure — Sales Command Center" },
      { property: "og:description", content: "Comando comercial completo: pipeline, ranking, metas, IA e modo TV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster theme="dark" position="top-right" expand={false} richColors />
    </>
  );
}

