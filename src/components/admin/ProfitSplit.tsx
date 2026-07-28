import { formatPrice } from "../../lib/utils";

interface ProfitSplitData {
  name: string;
  revenue: number;
}

interface ProfitSplitProps {
  title: string;
  data: ProfitSplitData[];
}

export function ProfitSplit({ title, data }: ProfitSplitProps) {
  // Sort descending by revenue
  const sortedData = [...data].sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-6 shadow-sm">
      <h3 className="font-mono text-xs text-[var(--color-brand-muted)] uppercase mb-4">{title}</h3>
      <div className="space-y-4">
        {sortedData.length > 0 ? (
          sortedData.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center border-b border-[var(--color-brand-border)] pb-2 last:border-0 last:pb-0">
              <span className="font-sans text-sm text-[var(--color-brand-text)]">{item.name}</span>
              <span className="font-mono text-sm text-[var(--color-brand-amber)]">{formatPrice(item.revenue)}</span>
            </div>
          ))
        ) : (
          <div className="text-center text-[var(--color-brand-muted)] font-mono text-xs py-4">Nenhum dado este mês.</div>
        )}
      </div>
    </div>
  );
}
