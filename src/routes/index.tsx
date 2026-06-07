import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Trophy, TrendingDown, Flame, Dumbbell, Sparkles, Medal, Crown, Award } from "lucide-react";
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { buildRanking, type RankingMetric, type Profile, type Assessment } from "@/lib/scoring";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ranking Fit — Ranking Geral" },
      { name: "description", content: "Top 5 da evolução corporal do grupo: maior perda de peso, redução de gordura, ganho de massa magra e evolução geral." },
      { property: "og:title", content: "Ranking Fit — Ranking Geral" },
      { property: "og:description", content: "Top 5 da evolução corporal do grupo em tempo real." },
    ],
  }),
  component: RankingPage,
});

const METRICS: { id: RankingMetric; label: string; short: string; icon: React.ComponentType<{ className?: string }>; suffix: string; format: (n: number) => string; }[] = [
  { id: "evolution", label: "Evolução geral", short: "Geral", icon: Sparkles, suffix: " pts", format: (n) => n.toFixed(0) },
  { id: "weight_loss", label: "Maior perda de peso", short: "Peso", icon: TrendingDown, suffix: " kg", format: (n) => n.toFixed(1) },
  { id: "fat_loss", label: "Maior redução de gordura", short: "Gordura", icon: Flame, suffix: " %", format: (n) => n.toFixed(1) },
  { id: "lean_gain", label: "Maior ganho de massa magra", short: "Magra", icon: Dumbbell, suffix: " kg", format: (n) => n.toFixed(1) },
];

const MEDAL_COLORS = ["var(--color-gold)", "var(--color-silver)", "var(--color-bronze)"];
const BAR_COLORS = [
  "var(--color-primary)",
  "var(--color-primary-glow)",
  "var(--color-primary)",
  "var(--color-primary-glow)",
  "var(--color-primary)",
];

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "?";
}

function RankingPage() {
  const [metric, setMetric] = useState<RankingMetric>("evolution");

  const { data, isLoading } = useQuery({
    queryKey: ["ranking-data"],
    queryFn: async () => {
      const [{ data: profiles }, { data: assessments }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, avatar_url, height_cm, initial_weight, initial_body_fat, initial_lean_mass, start_date"),
        supabase.from("assessments").select("id, user_id, assessment_date, weight, body_fat_pct, lean_mass, waist_cm, hip_cm, arm_cm, thigh_cm, notes, created_at"),
      ]);
      return {
        profiles: (profiles ?? []) as Profile[],
        assessments: (assessments ?? []) as Assessment[],
      };
    },
  });

  const ranked = useMemo(() => {
    if (!data) return [];
    return buildRanking(data.profiles, data.assessments, metric);
  }, [data, metric]);

  const top5 = ranked.slice(0, 5);
  const currentMetric = METRICS.find((m) => m.id === metric)!;

  const chartData = top5.map((r, i) => ({
    name: r.profile.full_name.split(" ")[0] || "—",
    value:
      metric === "evolution" ? r.score :
      metric === "weight_loss" ? Math.max(0, r.weightLoss) :
      metric === "fat_loss" ? Math.max(0, r.fatLoss) : Math.max(0, r.leanGain),
    rank: i + 1,
  }));

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Hero */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Trophy className="h-3.5 w-3.5 text-primary" /> Ranking ao vivo
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
            Quem está <span className="text-gradient-fit">evoluindo</span> mais?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Acompanhe a transformação do grupo em tempo real. Pontuação calculada por gordura, massa magra e peso.
          </p>
        </div>

        {/* Metric filters */}
        <div className="mb-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center">
          {METRICS.map((m) => {
            const active = m.id === metric;
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                  active ? "bg-gradient-fit border-transparent text-primary-foreground shadow-fit-glow"
                         : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{m.label}</span>
                <span className="sm:hidden">{m.short}</span>
              </button>
            );
          })}
        </div>

        {/* Chart */}
        <section className="card-fit p-5 sm:p-8">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">{currentMetric.label}</h2>
            <span className="text-xs text-muted-foreground">Top 5</span>
          </div>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">Carregando…</div>
          ) : chartData.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "color-mix(in oklab, var(--color-primary) 10%, transparent)" }}
                    contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }}
                    formatter={(v: number) => [currentMetric.format(v) + currentMetric.suffix, currentMetric.short]}
                  />
                  <Bar dataKey="value" radius={[10, 10, 4, 4]}>
                    {chartData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Top 5 list */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Pódio</h2>
          {top5.length === 0 ? (
            <div className="card-fit p-8 text-center text-sm text-muted-foreground">
              Nenhuma avaliação registrada ainda. Crie sua conta e comece a sua jornada.
            </div>
          ) : (
            <ul className="grid gap-3">
              {top5.map((r, i) => {
                const v =
                  metric === "evolution" ? r.score :
                  metric === "weight_loss" ? r.weightLoss :
                  metric === "fat_loss" ? r.fatLoss : r.leanGain;
                return (
                  <li key={r.profile.id} className="card-fit flex items-center gap-4 p-4 transition hover:border-primary/50">
                    <RankBadge rank={i + 1} />
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-secondary">
                      {r.profile.avatar_url ? (
                        <img src={r.profile.avatar_url} alt={r.profile.full_name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                          {initials(r.profile.full_name)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.profile.full_name || "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">Score evolução: {r.score} pts</p>
                    </div>
                    <div className="text-right">
                      <div className="text-gradient-fit text-xl font-bold tabular-nums sm:text-2xl">
                        {currentMetric.format(Math.max(0, v))}{currentMetric.suffix}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const isMedal = rank <= 3;
  const color = isMedal ? MEDAL_COLORS[rank - 1] : "var(--color-secondary)";
  const Icon = rank === 1 ? Crown : rank === 2 ? Medal : rank === 3 ? Award : Trophy;
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-black"
      style={{
        background: isMedal ? `color-mix(in oklab, ${color} 25%, var(--color-card))` : "var(--color-secondary)",
        border: `1px solid color-mix(in oklab, ${color} 60%, transparent)`,
        color,
      }}
    >
      {isMedal ? <Icon className="h-5 w-5" /> : <span className="text-sm">#{rank}</span>}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
      <Trophy className="h-10 w-10 text-primary/40" />
      <p className="text-sm">O ranking aparece aqui assim que houver avaliações.</p>
    </div>
  );
}
