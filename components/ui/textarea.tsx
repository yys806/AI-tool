import * as React from "react";

import { cn } from "../../lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[220px] w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm leading-relaxed text-[color:var(--ink)] shadow-sm placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
