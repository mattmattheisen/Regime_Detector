import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MacroState } from "@shared/schema";
import { STATE_PLAYBOOKS, STATE_DESCRIPTIONS, STATE_LABELS } from "@shared/schema";
import { TrendingUp, Zap, BarChart3, DollarSign, ChevronRight } from "lucide-react";

const STATE_COLORS: Record<MacroState, string> = {
  EQUITY_TREND: "text-emerald-400",
  VOLATILITY_SHOCK: "text-red-400",
  RATE_SHOCK: "text-amber-400",
  LIQUIDITY_SQUEEZE: "text-blue-400",
};

const STATE_ICONS: Record<MacroState, typeof TrendingUp> = {
  EQUITY_TREND: TrendingUp,
  VOLATILITY_SHOCK: Zap,
  RATE_SHOCK: BarChart3,
  LIQUIDITY_SQUEEZE: DollarSign,
};

export function PlaybookPanel({ currentState }: { currentState: MacroState }) {
  const Icon = STATE_ICONS[currentState];
  const playbook = STATE_PLAYBOOKS[currentState];
  const description = STATE_DESCRIPTIONS[currentState];

  return (
    <Card className="p-4">
      <h3 className="font-mono text-[10px] text-muted-foreground tracking-widest mb-3">PLAYBOOK MAPPING</h3>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${STATE_COLORS[currentState]}`} />
        <span className={`font-mono text-sm font-semibold ${STATE_COLORS[currentState]}`}>
          {currentState.replace(/_/g, " ")}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{description}</p>
      <div className="space-y-2">
        {playbook.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 py-1.5 px-2 bg-muted/30 rounded-md"
            data-testid={`playbook-item-${idx}`}
          >
            <ChevronRight className={`w-3 h-3 ${STATE_COLORS[currentState]} shrink-0`} />
            <span className="font-mono text-xs">{item}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
