import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * Catches a crash while rendering, so a visitor sees a way back rather than a
 * blank page. This also catches a page's code failing to load, which can happen
 * when a tab stays open across a deploy; a reload fixes that.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Arcanis] page crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground">
        <h1 className="font-serif text-2xl font-semibold text-primary">Something went wrong</h1>
        <p className="max-w-sm text-sm text-muted-foreground">This page could not be shown. Your spells are safe. Reloading usually fixes it.</p>
        <Button onClick={() => window.location.reload()}>Reload the page</Button>
      </div>
    );
  }
}
