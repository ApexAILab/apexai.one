import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  active?: boolean;
};

export function IconButton({
  label,
  children,
  className,
  active,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx("icon-button", active && "is-active", className)}
      {...props}
    >
      {children}
    </button>
  );
}
