import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2, Trash2, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Photo = { id: string; user_id: string; photo_type: "front" | "back" | "side"; photo_url: string; taken_at: string; };
const TYPES: { id: "front" | "back" | "side"; label: string }[] = [
  { id: "front", label: "Frente" },
  { id: "back", label: "Costas" },
  { id: "side", label: "Lateral" },
];

export const Route = createFileRoute("/_authenticated/photos")({
  component: PhotosPage,
});

function PhotosPage() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"front" | "back" | "side">("front");
  const [slider, setSlider] = useState(50);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: photos = [] } = useQuery({
    enabled: !!userId,
    queryKey: ["photos", userId],
    queryFn: async () => {
      const { data } = await supabase.from("progress_photos").select("*").eq("user_id", userId!).order("taken_at", { ascending: true });
      return (data ?? []) as Photo[];
    },
  });

  const ofType = photos.filter((p) => p.photo_type === activeType);
  const before = ofType[0];
  const after = ofType[ofType.length - 1];

  const upload = async (file: File, type: "front" | "back" | "side") => {
    if (!userId) return;
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${type}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("progress").upload(path, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("progress").getPublicUrl(path);
      const { error } = await supabase.from("progress_photos").insert({
        user_id: userId, photo_type: type, photo_url: data.publicUrl,
      });
      if (error) throw error;
      toast.success("Foto enviada");
      qc.invalidateQueries({ queryKey: ["photos"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    }
  };

  const remove = async (p: Photo) => {
    if (!confirm("Excluir foto?")) return;
    const { error } = await supabase.from("progress_photos").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Removida");
    qc.invalidateQueries({ queryKey: ["photos"] });
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Fotos de Evolução</h1>
      <p className="text-sm text-muted-foreground">Compare antes e depois com o slider interativo.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button key={t.id} onClick={() => setActiveType(t.id)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              activeType === t.id ? "bg-gradient-fit border-transparent text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}>
            {t.label}
          </button>
        ))}
        <div className="ml-auto">
          <UploadButton type={activeType} onPick={upload} />
        </div>
      </div>

      <section className="card-fit mt-6 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Antes × Depois — {TYPES.find((t) => t.id === activeType)?.label}</h2>
        {!before || !after || before.id === after.id ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Camera className="h-10 w-10 text-primary/40" />
            Envie ao menos 2 fotos para comparar.
          </div>
        ) : (
          <>
            <div className="relative mx-auto aspect-[3/4] max-w-md overflow-hidden rounded-2xl border border-border bg-secondary">
              <img src={before.photo_url} alt="Antes" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${slider}%` }}>
                <img src={after.photo_url} alt="Depois" className="absolute inset-0 h-full w-full object-cover" style={{ width: `${100 / (slider / 100)}%`, maxWidth: "none" }} />
              </div>
              <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-primary shadow-fit-glow" style={{ left: `${slider}%` }} />
              <div className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[10px] uppercase tracking-wider">Antes</div>
              <div className="absolute right-3 top-3 rounded-md bg-primary/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">Depois</div>
            </div>
            <input type="range" min={0} max={100} value={slider} onChange={(e) => setSlider(Number(e.target.value))}
              className="mx-auto mt-4 block w-full max-w-md accent-[var(--color-primary)]" />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{new Date(before.taken_at).toLocaleDateString("pt-BR")}</span>
              <span>{new Date(after.taken_at).toLocaleDateString("pt-BR")}</span>
            </div>
          </>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Histórico — {TYPES.find((t) => t.id === activeType)?.label}</h2>
        {ofType.length === 0 ? (
          <div className="card-fit p-8 text-center text-sm text-muted-foreground">Nenhuma foto.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ofType.map((p) => (
              <div key={p.id} className="card-fit group relative aspect-[3/4] overflow-hidden p-0">
                <img src={p.photo_url} alt="Progresso" className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent p-2 text-[11px]">
                  <span>{new Date(p.taken_at).toLocaleDateString("pt-BR")}</span>
                  <button onClick={() => remove(p)} className="rounded p-1 text-white/80 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function UploadButton({ type, onPick }: { type: "front" | "back" | "side"; onPick: (f: File, t: "front" | "back" | "side") => Promise<void> }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input ref={ref} type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setBusy(true);
        await onPick(f, type);
        setBusy(false);
        if (ref.current) ref.current.value = "";
      }} />
      <button onClick={() => ref.current?.click()} disabled={busy} className="bg-gradient-fit shadow-fit-glow flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Enviar foto
      </button>
    </>
  );
}
