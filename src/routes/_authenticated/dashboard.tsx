import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Plus, Scale, Flame, Dumbbell, Activity, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calcBMI, evolutionScore, type Assessment, type Profile } from "@/lib/scoring";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data } = useQuery({
    enabled: !!userId,
    queryKey: ["dashboard", userId],
    queryFn: async () => {
      const [{ data: profile }, { data: assessments }] = await Promise.all([
        (supabase as any).from("profiles").select("*").eq("id", userId!).maybeSingle(),
        (supabase as any).from("assessments").select("*").eq("user_id", userId!).order("assessment_date", { ascending: true }),
      ]);
      return {
        profile: profile as Profile | null,
        assessments: (assessments ?? []) as Assessment[],
      };
    },
  });

  const profile = data?.profile;
  const list = data?.assessments ?? [];
  const first = list[0] ?? null;
  const latest = list[list.length - 1] ?? null;

  const initialWeight = profile?.initial_weight ?? first?.weight ?? null;
  const initialFat = profile?.initial_body_fat ?? first?.body_fat_pct ?? null;
  const initialLean = profile?.initial_lean_mass ?? first?.lean_mass ?? null;

  const bmi = calcBMI(latest?.weight, profile?.height_cm);
  const score = evolutionScore({
    initialWeight, currentWeight: latest?.weight,
    initialFat, currentFat: latest?.body_fat_pct,
    initialLean, currentLean: latest?.lean_mass,
  });

  const days = profile ? Math.max(0, Math.floor((Date.now() - new Date(profile.start_date).getTime()) / (1000 * 60 * 60 * 24))) : 0;

  const chart = list.map((a) => ({
    date: new Date(a.assessment_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    peso: a.weight,
    gordura: a.body_fat_pct ?? null,
    magra: a.lean_mass ?? null,
  }));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Olá, <span className="text-gradient-fit">{(profile?.full_name || "atleta").split(" ")[0]}</span>
          </h1>
          <p className="text-sm text-muted-foreground">{days} dias desde o início da sua jornada</p>
        </div>
        <Link to="/assessments" className="bg-gradient-fit shadow-fit-glow flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Nova Avaliação
        </Link>
      </div>

      {/* Score hero */}
      <section className="card-fit relative mb-6 overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Score de evolução</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-gradient-fit text-6xl font-black tabular-nums sm:text-7xl">{score}</span>
              <span className="text-lg text-muted-foreground">/100</span>
            </div>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Combinação ponderada de redução de gordura (40%), ganho de massa magra (40%) e perda de peso (20%).
            </p>
          </div>
          <ScoreRing score={score} />
        </div>
      </section>

      {/* Stats grid */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Scale} label="Peso atual" value={latest ? `${latest.weight.toFixed(1)} kg` : "—"} sub={initialWeight ? `Inicial: ${initialWeight.toFixed(1)} kg` : "Sem dados"} />
        <StatCard icon={Flame} label="Gordura" value={latest?.body_fat_pct != null ? `${latest.body_fat_pct.toFixed(1)}%` : "—"} sub={initialFat != null ? `Inicial: ${initialFat.toFixed(1)}%` : "Sem dados"} />
        <StatCard icon={Dumbbell} label="Massa magra" value={latest?.lean_mass != null ? `${latest.lean_mass.toFixed(1)} kg` : "—"} sub={initialLean != null ? `Inicial: ${initialLean.toFixed(1)} kg` : "Sem dados"} />
        <StatCard icon={Activity} label="IMC" value={bmi ? bmi.toFixed(1) : "—"} sub={profile?.height_cm ? `Altura: ${profile.height_cm} cm` : "Sem altura"} />
      </section>

      {/* Charts */}
      <section className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Peso (kg)" empty={chart.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart}>
              <defs>
                <linearGradient id="gw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area dataKey="peso" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#gw)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Gordura (%)" empty={chart.filter((c) => c.gordura != null).length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line dataKey="gordura" stroke="var(--color-primary-glow)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Massa magra (kg)" empty={chart.filter((c) => c.magra != null).length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line dataKey="magra" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {list.length === 0 && (
        <div className="card-fit mt-6 flex flex-col items-center gap-3 p-10 text-center">
          <CalendarDays className="h-10 w-10 text-primary" />
          <p className="font-semibold">Sua primeira avaliação te espera</p>
          <p className="max-w-sm text-sm text-muted-foreground">Registre suas medidas iniciais para começar a acompanhar sua evolução e entrar no ranking.</p>
          <Link to="/assessments" className="bg-gradient-fit mt-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground">Registrar agora</Link>
        </div>
      )}
    </main>
  );
}

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
};

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string; }) {
  return (
    <div className="card-fit p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" /> {label}
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function ChartCard({ title, children, empty }: { title: string; children: React.ReactNode; empty: boolean }) {
  return (
    <div className="card-fit p-5">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="h-52">
        {empty ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem dados ainda</div>
        ) : children}
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative h-32 w-32">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} stroke="var(--color-secondary)" strokeWidth="10" fill="none" />
        <circle cx="60" cy="60" r={r} stroke="url(#ringGrad)" strokeWidth="10" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset} />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-primary-glow)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xl font-bold">{pct}</div>
    </div>
  );
}
