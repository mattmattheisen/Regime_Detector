import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ClassificationResult, MacroState } from "@shared/schema";
import { STATE_LABELS } from "@shared/schema";
import { TrendingUp, Zap, BarChart3, DollarSign } from "lucide-react";

const STATE_COLORS: Record<MacroState, string> = {
  EQUITY_TREND: "text-emerald-400",
  VOLATILITY_SHOCK: "text-red-400",
  RATE_SHOCK: "text-amber-400",
  LIQUIDITY_SQUEEZE: "text-blue-400",
};

const STATE_BG_COLORS: Record<MacroState, string> = {
  EQUITY_TREND: "bg-emerald-500/10 border-emerald-500/20",
  VOLATILITY_SHOCK: "bg-red-500/10 border-red-500/20",
  RATE_SHOCK: "bg-amber-500/10 border-amber-500/20",
  LIQUIDITY_SQUEEZE: "bg-blue-500/10 border-blue-500/20",
};

const STATE_ICONS: Record<MacroState, typeof TrendingUp> = {
  EQUITY_TREND: TrendingUp,
  VOLATILITY_SHOCK: Zap,
  RATE_SHOCK: BarChart3,
  LIQUIDITY_SQUEEZE: DollarSign,
};

export function StateHeader({ classification }: { classification: ClassificationResult }) {
  const Icon = STATE_ICONS[classification.currentState];
  const colorClass = STATE_COLORS[classification.currentState];
  const bgClass = STATE_BG_COLORS[classification.currentState];

  return (
    <Card className={`p-4 border ${bgClass}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-md ${bgClass}`}>
            <Icon className={`w-6 h-6 ${colorClass}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] text-muted-foreground tracking-widest">CURRENT STATE</span>
            </div>
            <h2 className={`font-mono text-xl font-bold tracking-wide ${colorClass}`} data-testid="text-current-state">
              {classification.currentState.replace(/_/g, " ")}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-6 flex-wrap">
          <div className="text-right">
            <span className="font-mono text-[10px] text-muted-foreground tracking-widest block">CONFIDENCE</span>
            <span className={`font-mono text-2xl font-bold ${colorClass}`} data-testid="text-confidence">
              {(classification.confidence * 100).toFixed(1)}%
            </span>
          </div>
          <div className="text-right">
            <span className="font-mono text-[10px] text-muted-foreground tracking-widest block">RUNNER-UP</span>
            <span className={`font-mono text-sm font-semibold ${STATE_COLORS[classification.runnerUp]}`} data-testid="text-runner-up">
              {classification.runnerUp.replace(/_/g, " ")}
            </span>
            <span className="font-mono text-xs text-muted-foreground ml-1.5">
              {(classification.runnerUpConfidence * 100).toFixed(1)}%
            </span>
          </div>
          <div className="text-right">
            <span className="font-mono text-[10px] text-muted-foreground tracking-widest block">AS OF</span>
            <span className="font-mono text-sm" data-testid="text-as-of">
              {classification.asOfDate}
            </span>
          </div>
          <div className="text-right">
            <span className="font-mono text-[10px] text-muted-foreground tracking-widest block">FREQUENCY</span>
            <Badge variant="outline" className="font-mono text-[10px]" data-testid="badge-frequency">
              {classification.frequency.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
