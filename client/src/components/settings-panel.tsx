import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X, Save } from "lucide-react";
import { useState } from "react";
import { DEFAULT_TICKERS } from "@shared/schema";
import type { TickerConfig } from "@shared/schema";

interface SettingsPanelProps {
  frequency: "weekly" | "daily";
  onFrequencyChange: (f: "weekly" | "daily") => void;
  onClose: () => void;
}

const TICKER_LABELS: Record<keyof TickerConfig, string> = {
  equity: "Equity Beta",
  breadth: "Breadth Proxy",
  creditHigh: "Credit (High Yield)",
  creditQuality: "Credit (Quality)",
  usd: "USD Proxy",
  duration: "Duration Proxy",
  commodities: "Commodities",
  vixProxy: "VIX Proxy",
};

export function SettingsPanel({ frequency, onFrequencyChange, onClose }: SettingsPanelProps) {
  const [tickers, setTickers] = useState<TickerConfig>({ ...DEFAULT_TICKERS });

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="font-mono text-[10px] text-muted-foreground tracking-widest">SETTINGS</h3>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-settings">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="font-mono text-[10px] text-muted-foreground tracking-wider">FREQUENCY</Label>
          <div className="flex gap-1 mt-1.5">
            <Button
              variant={frequency === "weekly" ? "default" : "outline"}
              size="sm"
              className="flex-1 font-mono text-[10px]"
              onClick={() => onFrequencyChange("weekly")}
              data-testid="button-settings-weekly"
            >
              WEEKLY
            </Button>
            <Button
              variant={frequency === "daily" ? "default" : "outline"}
              size="sm"
              className="flex-1 font-mono text-[10px]"
              onClick={() => onFrequencyChange("daily")}
              data-testid="button-settings-daily"
            >
              DAILY
            </Button>
          </div>
        </div>

        <div>
          <Label className="font-mono text-[10px] text-muted-foreground tracking-wider mb-2 block">
            TICKER CONFIGURATION
          </Label>
          <div className="space-y-2">
            {(Object.keys(tickers) as (keyof TickerConfig)[]).map((key) => (
              <div key={key}>
                <Label className="font-mono text-[9px] text-muted-foreground">{TICKER_LABELS[key]}</Label>
                <Input
                  value={tickers[key]}
                  onChange={(e) => setTickers((prev) => ({ ...prev, [key]: e.target.value.toUpperCase() }))}
                  className="font-mono text-xs h-8 mt-0.5"
                  data-testid={`input-ticker-${key}`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          <p className="font-mono text-[9px] text-muted-foreground mb-2">
            Ticker changes require a data refresh to take effect.
          </p>
        </div>
      </div>
    </div>
  );
}
