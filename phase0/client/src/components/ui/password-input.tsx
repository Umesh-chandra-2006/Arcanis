import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

/** A password field with a show/hide toggle. */
function PasswordInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [shown, setShown] = React.useState(false);
  return (
    <div className="relative w-full">
      <Input type={shown ? "text" : "password"} className={cn("pr-9", className)} {...props} />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-primary"
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        onClick={() => setShown((s) => !s)}
      >
        {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export { PasswordInput };
