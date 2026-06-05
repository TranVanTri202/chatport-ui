import { Icon, type IconName } from "@/components/ui/Icon";

interface StatCardProps {
  readonly label: string;
  readonly value: number | string;
  readonly icon: IconName;
  readonly sub?: string;
  readonly accent?: boolean;
}

export function StatCard({ label, value, icon, sub, accent = false }: StatCardProps): JSX.Element {
  return (
    <div className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-[16px_18px] shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-medium text-muted">{label}</span>
        <span className={accent ? "text-accent" : "text-muted/60"}>
          <Icon name={icon} size={16} />
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-sans text-[28px] font-semibold tracking-tight text-text">{value}</span>
        {sub ? <span className="text-xs text-muted">{sub}</span> : null}
      </div>
    </div>
  );
}
