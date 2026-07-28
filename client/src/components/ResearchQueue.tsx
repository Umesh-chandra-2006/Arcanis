import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface ResearchItem {
  spellId: string;
  spellName: string;
  startTime: number;
  durationMs: number;
}

interface ResearchQueueProps {
  items: ResearchItem[];
  isLoading?: boolean;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

export function ResearchQueue({ items, isLoading = false }: ResearchQueueProps) {
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newElapsedTimes: Record<string, number> = {};

      items.forEach((item) => {
        const elapsed = Math.max(0, now - item.startTime);
        newElapsedTimes[item.spellId] = elapsed;
      });

      setElapsedTimes(newElapsedTimes);
    }, 100);

    return () => clearInterval(interval);
  }, [items]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Research Queue</CardTitle>
          <CardDescription>Spells being researched</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Research Queue</CardTitle>
          <CardDescription>Spells being researched</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No spells in research queue
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Research Queue</CardTitle>
        <CardDescription>{items.length} spell(s) researching</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const elapsed = elapsedTimes[item.spellId] ?? 0;
          const isComplete = elapsed >= item.durationMs;

          return (
            <div key={item.spellId} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.spellName}</span>
                <Badge variant={isComplete ? "default" : "secondary"}>
                  {isComplete ? "✓ Complete" : `Elapsed: ${formatTime(elapsed)}`}
                </Badge>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full animate-pulse"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
