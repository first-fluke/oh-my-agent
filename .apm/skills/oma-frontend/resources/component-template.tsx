/**
 * Component Template for Frontend Agent
 *
 * This is a reference template for creating new components.
 * Follow this structure for consistency.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// 1. Type Definitions
interface ComponentNameProps {
  className?: string;
  children: ReactNode;
  // Add specific props here
  variant?: "default" | "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
}

// 2. Main Component
export function ComponentName({
  className,
  children,
  variant = "default",
  size = "md",
  onClick,
  disabled = false,
}: ComponentNameProps) {
  // 3. Hooks (if needed)
  // const [state, setState] = useState();

  // 4. Effects (if needed)
  // useEffect(() => {}, []);

  // 5. Event Handlers
  const handleClick = () => {
    if (disabled) return;
    onClick?.();
  };

  // 6. Computed Values
  const classes = cn(
    // Base styles
    "inline-flex items-center justify-center rounded-md font-medium transition-colors",
    // Variants
    {
      "bg-primary text-primary-foreground hover:bg-primary/90":
        variant === "primary",
      "bg-secondary text-secondary-foreground hover:bg-secondary/80":
        variant === "secondary",
      "bg-background text-foreground hover:bg-accent": variant === "default",
    },
    // Sizes
    {
      "h-8 px-3 text-sm": size === "sm",
      "h-10 px-4 text-base": size === "md",
      "h-12 px-6 text-lg": size === "lg",
    },
    // States
    {
      "opacity-50 cursor-not-allowed": disabled,
    },
    className,
  );

  // 7. Render
  return (
    <button
      type="button"
      className={classes}
      onClick={handleClick}
      disabled={disabled}
      aria-disabled={disabled}
    >
      {children}
    </button>
  );
}

// 8. Sub-components (if needed)
ComponentName.Slot = function ComponentNameSlot({
  className,
  children,
}: ComponentNameProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>{children}</div>
  );
};

// 9. Display Name (for debugging)
ComponentName.displayName = "ComponentName";
