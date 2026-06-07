import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogIn, LogOut, Trophy, LayoutDashboard, ClipboardList, Camera, User as UserIcon, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "./Logo";

export function AppNav() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const links = userId
    ? [
        { to: "/", label: "Ranking", icon: Trophy },
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/assessments", label: "Avaliações", icon: ClipboardList },
        { to: "/photos", label: "Fotos", icon: Camera },
        { to: "/profile", label: "Perfil", icon: UserIcon },
      ]
    : [{ to: "/", label: "Ranking", icon: Trophy }];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="shrink-0"><Logo /></Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block">
          {userId ? (
            <button onClick={signOut} className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary/70">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          ) : (
            <Link to="/auth" className="bg-gradient-fit shadow-fit-glow flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95">
              <LogIn className="h-4 w-4" /> Entrar
            </Link>
          )}
        </div>

        <button className="rounded-lg border border-border p-2 text-foreground md:hidden" onClick={() => setOpen((o) => !o)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 px-4 pb-4 md:hidden">
          <div className="mt-3 flex flex-col gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary">
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
            {userId ? (
              <button onClick={signOut} className="mt-2 flex items-center gap-3 rounded-lg bg-secondary px-3 py-2 text-sm">
                <LogOut className="h-4 w-4" /> Sair
              </button>
            ) : (
              <Link to="/auth" className="bg-gradient-fit mt-2 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground">
                <LogIn className="h-4 w-4" /> Entrar
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
