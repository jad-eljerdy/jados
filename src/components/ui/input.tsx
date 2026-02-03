import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-muted-foreground"
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(
            "flex h-9 w-full rounded-lg border border-border/50 bg-secondary/50 px-3 py-2 text-sm transition-all duration-150",
            "placeholder:text-muted-foreground/60",
            "hover:border-border hover:bg-secondary/80",
            "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/50 focus:bg-background",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
