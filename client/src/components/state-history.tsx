import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { StateHistoryEntry, MacroState } from "@shared/schema";

const STATE_COLORS: Record<MacroState, string> = {
  EQUITY_TREND: "text-emerald-400",
  VOLATILITY_SHOCK: "text-red-400",
  RATE_SHOCK: "text-amber-400",
  LIQUIDITY_SQUEEZE: "text-blue-400",
};

const STATE_DOT_COLORS: Record<MacroState, string> = {
  EQUITY_TREND: "bg-emerald-500",
  VOLATILITY_SHOCK: "bg-red-500",
  RATE_SHOCK: "bg-amber-500",
  LIQUIDITY_SQUEEZE: "bg-blue-500",
};

export function StateHistory({ history }: { history: StateHistoryEntry[] }) {
  if (!history || history.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="font-mono text-[10px] text-muted-foreground tracking-widest mb-3">STATE HISTORY</h3>
        <p className="font-mono text-xs text-muted-foreground">No history available yet.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h3 className="font-mono text-[10px] text-muted-foreground tracking-widest">STATE HISTORY</h3>
        <span className="font-mono text-[10px] text-muted-foreground">
          {history.length} PERIODS
        </span>
      </div>

      <div className="flex gap-0.5 mb-4 flex-wrap" data-testid="state-history-timeline">
        {history.map((entry, idx) => (
          <div
            key={idx}
            className={`w-2 h-6 rounded-sm ${STATE_DOT_COLORS[entry.state]}`}
            style={{ opacity: 0.4 + entry.confidence * 0.6 }}
            title={`${entry.date}: ${entry.state} (${(entry.confidence * 100).toFixed(1)}%)`}
          />
        ))}
      </div>

      <ScrollArea className="h-[200px]">
        <table className="w-full" data-testid="table-state-history">
          <thead>
            <tr className="border-b border-border">
              <th className="font-mono text-[10px] text-muted-foreground tracking-widest text-left py-2 pr-4">DATE</th>
              <th className="font-mono text-[10px] text-muted-foreground tracking-widest text-left py-2 pr-4">STATE</th>
              <th className="font-mono text-[10px] text-muted-foreground tracking-widest text-right py-2">CONFIDENCE</th>
            </tr>
          </thead>
          <tbody>
            {[...history].reverse().map((entry, idx) => (
              <tr key={idx} className="border-b border-border/50" data-testid={`row-history-${idx}`}>
                <td className="font-mono text-xs py-1.5 pr-4 text-muted-foreground">{entry.date}</td>
                <td className="py-1.5 pr-4">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${STATE_DOT_COLORS[entry.state]}`} />
                    <span className={`font-mono text-xs font-medium ${STATE_COLORS[entry.state]}`}>
                      {entry.state.replace(/_/g, " ")}
                    </span>
                  </div>
                </td>
                <td className="font-mono text-xs py-1.5 text-right">
                  {(entry.confidence * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </Card>
  );
}
