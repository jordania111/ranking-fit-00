import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Activity, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Ranking Fit" },
      { name: "description", content: "Entre ou crie sua conta no Ranking Fit." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Conta criada! Bem-vindo.");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha na autenticação");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (res.error) {
      toast.error("Erro ao entrar com Google");
      setLoading(false);
      return;
    }
    if (!res.redirected) navigate({ to: "/dashboard" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary-glow/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
        <Link to="/" className="mx-auto mb-8"><Logo /></Link>

        <div className="card-fit p-7 shadow-fit-glow">
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Continue sua jornada de evolução." : "Comece a acompanhar sua evolução hoje."}
          </p>

          <button
            onClick={google}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-medium hover:bg-secondary/70 disabled:opacity-60"
          >
            <GoogleIcon /> Continuar com Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="grid gap-3">
            {mode === "signup" && (
              <Field label="Nome completo">
                <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Seu nome" />
              </Field>
            )}
            <Field label="E-mail">
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="voce@email.com" />
            </Field>
            <Field label="Senha">
              <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-fit shadow-fit-glow mt-2 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-5 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
          </button>
        </div>

        <Link to="/" className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <Activity className="h-3.5 w-3.5" /> Voltar ao ranking público
        </Link>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 11v3.2h4.5c-.2 1.2-1.4 3.5-4.5 3.5-2.7 0-4.9-2.2-4.9-5s2.2-5 4.9-5c1.5 0 2.6.6 3.2 1.2l2.2-2.1C15.9 5.4 14.1 4.5 12 4.5 7.9 4.5 4.5 7.9 4.5 12s3.4 7.5 7.5 7.5c4.3 0 7.2-3 7.2-7.3 0-.5 0-.9-.1-1.2H12z"/>
    </svg>
  );
}
