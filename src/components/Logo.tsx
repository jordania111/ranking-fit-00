import { Activity } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="bg-gradient-fit shadow-fit-glow flex h-9 w-9 items-center justify-center rounded-xl">
        <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-base font-bold tracking-tight">
          Ranking<span className="text-gradient-fit">Fit</span>
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Evolução Corporal
        </span>
      </div>
    </div>
  );
}
