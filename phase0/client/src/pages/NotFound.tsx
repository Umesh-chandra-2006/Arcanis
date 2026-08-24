import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="font-serif text-6xl font-semibold text-primary">404</h1>
      <p className="text-sm text-muted-foreground">
        This page has been scattered to the winds.
      </p>
      <Link to="/">
        <Button>Return to Arcanis</Button>
      </Link>
    </div>
  );
}