import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Calendar, Scale, Flame, Dumbbell, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Assessment } from "@/lib/scoring";

export const Route = createFileRoute("/_authenticated/assessments")({
  component: AssessmentsPage,
});

type FormState = {
  assessment_date: string;
  weight: string;
  body_fat_pct: string;
  lean_mass: string;
  waist_cm: string;
  hip_cm: string;
  arm_cm: string;
  thigh_cm: string;
  notes: string;
};

const empty: FormState = {
  assessment_date: new Date().toISOString().slice(0, 10),
  weight: "", body_fat_pct: "", lean_mass: "",
  waist_cm: "", hip_cm: "", arm_cm: "", thigh_cm: "",
  notes: "",
};

function AssessmentsPage() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: list = [], isLoading } = useQuery({
    enabled: !!userId,
    queryKey: ["assessments", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("assessments")
        .select("*")
        .eq("user_id", userId!)
        .order("assessment_date", { ascending: false });
      return (data ?? []) as Assessment[];
    },
  });

  const numeric = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!form.weight) return toast.error("Informe o peso");
    setSaving(true);
    try {
      const isFirst = list.length === 0;
      const payload = {
        user_id: userId,
        assessment_date: form.assessment_date,
        weight: numeric(form.weight)!,
        body_fat_pct: numeric(form.body_fat_pct),
        lean_mass: numeric(form.lean_mass),
        waist_cm: numeric(form.waist_cm),
        hip_cm: numeric(form.hip_cm),
        arm_cm: numeric(form.arm_cm),
        thigh_cm: numeric(form.thigh_cm),
        notes: form.notes || null,
      };
      const { error } = await supabase.from("assessments").insert(payload);
      if (error) throw error;

      // First assessment: capture as baseline if profile is empty
      if (isFirst) {
        await supabase.from("profiles").update({
          initial_weight: payload.weight,
          initial_body_fat: payload.body_fat_pct,
          initial_lean_mass: payload.lean_mass,
          start_date: payload.assessment_date,
        }).eq("id", userId);
      }

      toast.success("Avaliação salva!");
      setForm(empty);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["assessments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["ranking-data"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta avaliação?")) return;
    const { error } = await supabase.from("assessments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removida");
    qc.invalidateQueries({ queryKey: ["assessments"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["ranking-data"] });
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Avaliações</h1>
          <p className="text-sm text-muted-foreground">Histórico completo das suas medidas.</p>
        </div>
        <button onClick={() => setOpen(true)} className="bg-gradient-fit shadow-fit-glow flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Nova Avaliação
        </button>
      </div>

      {isLoading ? (
        <div className="card-fit p-10 text-center text-muted-foreground">Carregando…</div>
      ) : list.length === 0 ? (
        <div className="card-fit p-10 text-center">
          <p className="font-semibold">Nenhuma avaliação ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">Crie sua primeira para começar.</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {list.map((a) => (
            <li key={a.id} className="card-fit p-4 transition hover:border-primary/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Calendar className="h-4 w-4 text-primary" />
                  {new Date(a.assessment_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
                <button onClick={() => remove(a.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Metric icon={Scale} label="Peso" value={`${a.weight.toFixed(1)} kg`} />
                <Metric icon={Flame} label="Gordura" value={a.body_fat_pct != null ? `${a.body_fat_pct.toFixed(1)}%` : "—"} />
                <Metric icon={Dumbbell} label="Magra" value={a.lean_mass != null ? `${a.lean_mass.toFixed(1)} kg` : "—"} />
                <Metric icon={Calendar} label="Cintura" value={a.waist_cm != null ? `${a.waist_cm} cm` : "—"} />
              </div>
              {a.notes && <p className="mt-3 text-xs text-muted-foreground">{a.notes}</p>}
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div className="card-fit w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="text-lg font-semibold">Nova Avaliação</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={submit} className="max-h-[70vh] overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Data"><input type="date" required value={form.assessment_date} onChange={(e) => setForm({ ...form, assessment_date: e.target.value })} className={inputCls} /></Field>
                <Field label="Peso (kg) *"><input required inputMode="decimal" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className={inputCls} placeholder="75.5" /></Field>
                <Field label="% Gordura"><input inputMode="decimal" value={form.body_fat_pct} onChange={(e) => setForm({ ...form, body_fat_pct: e.target.value })} className={inputCls} placeholder="18.0" /></Field>
                <Field label="Massa magra (kg)"><input inputMode="decimal" value={form.lean_mass} onChange={(e) => setForm({ ...form, lean_mass: e.target.value })} className={inputCls} placeholder="60.0" /></Field>
                <Field label="Cintura (cm)"><input inputMode="decimal" value={form.waist_cm} onChange={(e) => setForm({ ...form, waist_cm: e.target.value })} className={inputCls} /></Field>
                <Field label="Quadril (cm)"><input inputMode="decimal" value={form.hip_cm} onChange={(e) => setForm({ ...form, hip_cm: e.target.value })} className={inputCls} /></Field>
                <Field label="Braço (cm)"><input inputMode="decimal" value={form.arm_cm} onChange={(e) => setForm({ ...form, arm_cm: e.target.value })} className={inputCls} /></Field>
                <Field label="Coxa (cm)"><input inputMode="decimal" value={form.thigh_cm} onChange={(e) => setForm({ ...form, thigh_cm: e.target.value })} className={inputCls} /></Field>
              </div>
              <Field label="Observações" className="mt-3">
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={inputCls} placeholder="Como se sentiu, novidades no treino…" />
              </Field>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="bg-gradient-fit flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar Avaliação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; }) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Icon className="h-3 w-3 text-primary" /> {label}</div>
      <div className="mt-1 font-semibold tabular-nums">{value}</div>
    </div>
  );
}
