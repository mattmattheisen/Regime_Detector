import { Card } from "@/components/ui/card";
import type { StateScore, MacroState } from "@shared/schema";
import { TrendingUp, Zap, BarChart3, DollarSign } from "lucide-react";

const STATE_COLORS: Record<MacroState, string> = {
  EQUITY_TREND: "text-emerald-400",
  VOLATILITY_SHOCK: "text-red-400",
  RATE_SHOCK: "text-amber-400",
  LIQUIDITY_SQUEEZE: "text-blue-400",
};

const STATE_BAR_COLORS: Record<MacroState, string> = {
  EQUITY_TREND: "bg-emerald-500",
  VOLATILITY_SHOCK: "bg-red-500",
  RATE_SHOCK: "bg-amber-500",
  LIQUIDITY_SQUEEZE: "bg-blue-500",
};

const STATE_ICONS: Record<MacroState, typeof TrendingUp> = {
  EQUITY_TREND: TrendingUp,
  VOLATILITY_SHOCK: Zap,
  RATE_SHOCK: BarChart3,
  LIQUIDITY_SQUEEZE: DollarSign,
};

export function ProbabilitiesTable({ scores }: { scores: StateScore[] }) {
  const sorted = [...scores].sort((a, b) => b.probability - a.probability);

  return (
    <Card className="p-4">
      <h3 className="font-mono text-[10px] text-muted-foreground tracking-widest mb-3">STATE PROBABILITIES</h3>
      <div className="space-y-3">
        {sorted.map((s, idx) => {
          const Icon = STATE_ICONS[s.state];
          return (
            <div key={s.state} data-testid={`row-state-${s.state}`}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground w-3">{idx + 1}</span>
                  <Icon className={`w-3.5 h-3.5 ${STATE_COLORS[s.state]}`} />
                  <span className={`font-mono text-xs font-medium ${STATE_COLORS[s.state]}`}>
                    {s.state.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    SCORE {s.score.toFixed(2)}
                  </span>
                  <span className={`font-mono text-sm font-bold ${STATE_COLORS[s.state]}`}>
                    {(s.probability * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-sm overflow-hidden">
                <div
                  className={`h-full rounded-sm transition-all duration-500 ${STATE_BAR_COLORS[s.state]}`}
                  style={{ width: `${s.probability * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
