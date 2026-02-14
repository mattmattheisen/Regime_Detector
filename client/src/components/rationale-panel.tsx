import { Card } from "@/components/ui/card";
import type { FeatureReadings } from "@shared/schema";
import { Activity, BarChart3, TrendingUp, DollarSign, Layers, GitBranch, LineChart } from "lucide-react";

function ZScoreIndicator({ value, label }: { value: number; label: string }) {
  const absVal = Math.abs(value);
  let color = "text-muted-foreground";
  let bgColor = "bg-muted";

  if (absVal > 2) {
    color = value > 0 ? "text-emerald-400" : "text-red-400";
    bgColor = value > 0 ? "bg-emerald-500/15" : "bg-red-500/15";
  } else if (absVal > 1) {
    color = value > 0 ? "text-emerald-300" : "text-red-300";
    bgColor = value > 0 ? "bg-emerald-500/10" : "bg-red-500/10";
  } else if (absVal > 0.5) {
    color = value > 0 ? "text-emerald-200/70" : "text-red-200/70";
    bgColor = value > 0 ? "bg-emerald-500/5" : "bg-red-500/5";
  }

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
      <span className={`font-mono text-xs font-medium px-1.5 py-0.5 rounded-sm ${color} ${bgColor}`}>
        {value >= 0 ? "+" : ""}{value.toFixed(2)}
      </span>
    </div>
  );
}

function ValueIndicator({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
      <span className="font-mono text-xs font-medium">
        {value.toFixed(4)}{suffix || ""}
      </span>
    </div>
  );
}

export function RationalePanel({ features }: { features: FeatureReadings }) {
  const sections = [
    {
      title: "VOLATILITY",
      icon: Activity,
      items: [
        { label: "VIX PROXY LEVEL", value: features.volatility.vixProxyLevel, type: "value" as const },
        { label: "VIX PROXY Z-SCORE", value: features.volatility.vixProxyZScore, type: "zscore" as const },
        { label: "REALIZED VOL Z-SCORE", value: features.volatility.realizedVolZScore, type: "zscore" as const },
      ],
    },
    {
      title: "CREDIT",
      icon: BarChart3,
      items: [
        { label: "HYG/LQD RATIO", value: features.credit.creditRatio, type: "value" as const },
        { label: "CREDIT MOMENTUM", value: features.credit.creditMomentum, type: "zscore" as const },
        { label: "CREDIT Z-SCORE", value: features.credit.creditZScore, type: "zscore" as const },
      ],
    },
    {
      title: "BREADTH",
      icon: Layers,
      items: [
        { label: "RSP/SPY RATIO", value: features.breadth.breadthRatio, type: "value" as const },
        { label: "BREADTH MOMENTUM", value: features.breadth.breadthMomentum, type: "zscore" as const },
        { label: "BREADTH Z-SCORE", value: features.breadth.breadthZScore, type: "zscore" as const },
      ],
    },
    {
      title: "RATES / DURATION",
      icon: LineChart,
      items: [
        { label: "TLT MOMENTUM", value: features.rates.tltMomentum, type: "zscore" as const },
        { label: "DBC MOMENTUM", value: features.rates.dbcMomentum, type: "zscore" as const },
      ],
    },
    {
      title: "USD / LIQUIDITY",
      icon: DollarSign,
      items: [
        { label: "UUP MOMENTUM", value: features.usd.uupMomentum, type: "zscore" as const },
        { label: "UUP Z-SCORE", value: features.usd.uupZScore, type: "zscore" as const },
      ],
    },
    {
      title: "CORRELATION",
      icon: GitBranch,
      items: [
        { label: "SPY-TLT CORR", value: features.correlation.spyTltCorrelation, type: "value" as const },
        { label: "CORR CHANGE", value: features.correlation.correlationChange, type: "zscore" as const },
      ],
    },
    {
      title: "EQUITY TREND",
      icon: TrendingUp,
      items: [
        { label: "SPY MOMENTUM", value: features.equityTrend.spyMomentum, type: "zscore" as const },
        { label: "SPY TREND Z-SCORE", value: features.equityTrend.spyTrendZScore, type: "zscore" as const },
      ],
    },
  ];

  return (
    <Card className="p-4">
      <h3 className="font-mono text-[10px] text-muted-foreground tracking-widest mb-3">CLASSIFICATION RATIONALE</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sections.map((section) => {
          const SectionIcon = section.icon;
          return (
            <div key={section.title} className="bg-muted/30 rounded-md p-3" data-testid={`section-rationale-${section.title.toLowerCase().replace(/[^a-z]/g, "-")}`}>
              <div className="flex items-center gap-1.5 mb-2">
                <SectionIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground">
                  {section.title}
                </span>
              </div>
              <div className="divide-y divide-border/50">
                {section.items.map((item) =>
                  item.type === "zscore" ? (
                    <ZScoreIndicator key={item.label} label={item.label} value={item.value} />
                  ) : (
                    <ValueIndicator key={item.label} label={item.label} value={item.value} />
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
