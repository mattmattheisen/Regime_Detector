import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Clock } from "lucide-react";

interface DataStatusProps {
  dataStatus: {
    ticker: string;
    lastDate: string | null;
    barCount: number;
  }[];
  lastRefresh: string;
}

export function DataStatus({ dataStatus, lastRefresh }: DataStatusProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-muted-foreground" />
          <h3 className="font-mono text-[10px] text-muted-foreground tracking-widest">DATA STATUS</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="font-mono text-[10px] text-muted-foreground">
            LAST REFRESH: {lastRefresh || "NEVER"}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {dataStatus.map((d) => (
          <div key={d.ticker} className="bg-muted/30 rounded-md p-2" data-testid={`data-status-${d.ticker}`}>
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="font-mono text-xs font-semibold">{d.ticker}</span>
              <Badge
                variant="outline"
                className={`font-mono text-[9px] ${d.barCount > 0 ? "text-emerald-400" : "text-muted-foreground"}`}
              >
                {d.barCount > 0 ? "OK" : "EMPTY"}
              </Badge>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">
              {d.lastDate || "No data"}
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">
              {d.barCount.toLocaleString()} bars
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
