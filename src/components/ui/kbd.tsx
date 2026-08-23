import { cn } from "@/lib/utils";

/**
 * Kbd — the single keyboard-badge component for all browser-owned UI.
 * Wraps the `.sb-kbd` design-token class so every overlay renders
 * identical, aligned key chips. Never use raw <kbd> or inline styles.
 */
export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <kbd className={cn("sb-kbd", className)}>{children}</kbd>;
}
