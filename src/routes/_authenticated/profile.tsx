import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/scoring";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Partial<Profile> & { birth_date?: string | null; gender?: string | null }>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: profile } = useQuery({
    enabled: !!userId,
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("profiles").select("*").eq("id", userId!).maybeSingle();
      return data as (Profile & { birth_date?: string | null; gender?: string | null }) | null;
    },
  });

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    const { error } = await (supabase as any).from("profiles").update({
      full_name: form.full_name ?? "",
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      birth_date: form.birth_date || null,
      gender: (form.gender as "male" | "female" | "other" | null) || null,
      initial_weight: form.initial_weight ? Number(form.initial_weight) : null,
      initial_body_fat: form.initial_body_fat ? Number(form.initial_body_fat) : null,
      initial_lean_mass: form.initial_lean_mass ? Number(form.initial_lean_mass) : null,
      weight_goal: (form as { weight_goal?: number }).weight_goal ? Number((form as { weight_goal?: number }).weight_goal) : null,
    }).eq("id", userId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["ranking-data"] });
  };

  const onAvatar = async (file: File) => {
    if (!userId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error } = await (supabase as any).from("profiles").update({ avatar_url: data.publicUrl }).eq("id", userId);
      if (error) throw error;
      toast.success("Foto atualizada");
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["ranking-data"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Perfil</h1>
      <p className="text-sm text-muted-foreground">Mantenha seus dados atualizados para um score preciso.</p>

      <section className="card-fit mt-6 flex items-center gap-5 p-5">
        <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-secondary">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
              {(profile?.full_name || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="font-semibold">{profile?.full_name || "Sem nome"}</p>
          <p className="text-xs text-muted-foreground">{profile?.email}</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onAvatar(e.target.files[0])} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm hover:bg-secondary/70">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Foto
        </button>
      </section>

      <form onSubmit={save} className="card-fit mt-4 grid gap-3 p-5 sm:grid-cols-2">
        <Field label="Nome completo"><input className={inputCls} value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
        <Field label="Data de nascimento"><input type="date" className={inputCls} value={form.birth_date ?? ""} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></Field>
        <Field label="Sexo">
          <select className={inputCls} value={form.gender ?? ""} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="">—</option>
            <option value="male">Masculino</option>
            <option value="female">Feminino</option>
            <option value="other">Outro</option>
          </select>
        </Field>
        <Field label="Altura (cm)"><input inputMode="decimal" className={inputCls} value={form.height_cm ?? ""} onChange={(e) => setForm({ ...form, height_cm: e.target.value as unknown as number })} /></Field>

        <div className="sm:col-span-2 mt-2 border-t border-border pt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Linha de base</div>
        <Field label="Peso inicial (kg)"><input inputMode="decimal" className={inputCls} value={form.initial_weight ?? ""} onChange={(e) => setForm({ ...form, initial_weight: e.target.value as unknown as number })} /></Field>
        <Field label="Gordura inicial (%)"><input inputMode="decimal" className={inputCls} value={form.initial_body_fat ?? ""} onChange={(e) => setForm({ ...form, initial_body_fat: e.target.value as unknown as number })} /></Field>
        <Field label="Massa magra inicial (kg)"><input inputMode="decimal" className={inputCls} value={form.initial_lean_mass ?? ""} onChange={(e) => setForm({ ...form, initial_lean_mass: e.target.value as unknown as number })} /></Field>
        <Field label="Meta de peso (kg)"><input inputMode="decimal" className={inputCls} value={(form as { weight_goal?: number }).weight_goal ?? ""} onChange={(e) => setForm({ ...form, weight_goal: e.target.value as unknown as number } as Partial<Profile>)} /></Field>

        <div className="sm:col-span-2 mt-2 flex justify-end">
          <button type="submit" disabled={saving} className="bg-gradient-fit flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar perfil
          </button>
        </div>
      </form>
    </main>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
