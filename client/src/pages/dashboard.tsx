import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { DashboardData } from "@shared/schema";
import { StateHeader } from "@/components/state-header";
import { ProbabilitiesTable } from "@/components/probabilities-table";
import { RationalePanel } from "@/components/rationale-panel";
import { PlaybookPanel } from "@/components/playbook-panel";
import { StateHistory } from "@/components/state-history";
import { DataStatus } from "@/components/data-status";
import { SettingsPanel } from "@/components/settings-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Settings, Download, Activity } from "lucide-react";
import { useState } from "react";
import shomerLogo from "@assets/Shomer_Analytics_Logo_1775340026904.png";

export default function Dashboard() {
  const { toast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [frequency, setFrequency] = useState<"weekly" | "daily">("weekly");

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard", frequency],
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/refresh", { frequency });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && typeof key[0] === "string" && key[0].startsWith("/api/dashboard");
      }});
      toast({ title: "Data refreshed", description: "Market data has been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Refresh failed", description: err.message, variant: "destructive" });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", `/api/export?frequency=${frequency}`);
      return res.json();
    },
    onSuccess: (exportData) => {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `macro-state-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (err: Error) => {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    },
  });

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-mono text-sm font-semibold mb-2">DATA UNAVAILABLE</h2>
          <p className="text-xs text-muted-foreground mb-4">
            {error.message || "Unable to load dashboard data. Try refreshing."}
          </p>
          <Button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            data-testid="button-retry-refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
            Fetch Data
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="flex items-center gap-4 flex-wrap">
            <img src={shomerLogo} alt="Shomer Analytics" className="h-12 w-auto" data-testid="img-logo" />
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-sm font-bold tracking-wide" data-testid="text-app-title">
                REGIME DETECTOR
              </h1>
              <Badge variant="outline" className="font-mono text-[10px]" data-testid="badge-version">
                v1.0
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center border border-border rounded-md overflow-visible">
              <Button
                variant={frequency === "weekly" ? "default" : "ghost"}
                size="sm"
                className="rounded-none rounded-l-md font-mono text-[10px] no-default-hover-elevate no-default-active-elevate"
                onClick={() => setFrequency("weekly")}
                data-testid="button-freq-weekly"
              >
                WEEKLY
              </Button>
              <Button
                variant={frequency === "daily" ? "default" : "ghost"}
                size="sm"
                className="rounded-none rounded-r-md font-mono text-[10px] no-default-hover-elevate no-default-active-elevate"
                onClick={() => setFrequency("daily")}
                data-testid="button-freq-daily"
              >
                DAILY
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              data-testid="button-refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              data-testid="button-export"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(!settingsOpen)}
              data-testid="button-settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <main className="flex-1 p-4 space-y-4 overflow-auto">
          {isLoading ? <DashboardSkeleton /> : data ? (
            <>
              <StateHeader classification={data.classification} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ProbabilitiesTable scores={data.classification.scores} />
                <PlaybookPanel currentState={data.classification.currentState} />
              </div>
              <RationalePanel features={data.classification.features} />
              <StateHistory history={data.history} />
              <DataStatus dataStatus={data.dataStatus} lastRefresh={data.lastRefresh} />
            </>
          ) : null}
        </main>

        {settingsOpen && (
          <aside className="w-72 border-l border-border p-4 bg-card/50 space-y-4 shrink-0">
            <SettingsPanel
              frequency={frequency}
              onFrequencyChange={setFrequency}
              onClose={() => setSettingsOpen(false)}
            />
          </aside>
        )}
      </div>

      <footer className="border-t border-border px-4 py-2 text-center" data-testid="footer-branding">
        <span className="text-xs font-mono text-muted-foreground tracking-wide">Matt Mattheisen &middot; Shomer Analytics</span>
      </footer>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
