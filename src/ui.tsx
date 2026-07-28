import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Slot } from "@radix-ui/react-slot";
import { XIcon } from "@phosphor-icons/react";
import { BorderBeam } from "border-beam";
import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type FocusEventHandler,
  type HTMLAttributes,
  type MouseEventHandler,
  type ReactNode,
} from "react";
import { cn } from "./lib";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "icon";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      asChild,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const Component = asChild ? Slot : "button";
    return (
      <Component
        ref={ref}
        type={asChild ? undefined : type}
        className={cn("button", `button-${variant}`, `button-${size}`, className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export const PulseButton = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      disabled,
      onBlur,
      onFocus,
      onMouseEnter,
      onMouseLeave,
      variant = "primary",
      ...props
    },
    ref,
  ) => {
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const activate: MouseEventHandler<HTMLButtonElement> = (event) => {
      onMouseEnter?.(event);
      if (!disabled) setHovered(true);
    };
    const deactivate: MouseEventHandler<HTMLButtonElement> = (event) => {
      onMouseLeave?.(event);
      setHovered(false);
    };
    const focus: FocusEventHandler<HTMLButtonElement> = (event) => {
      onFocus?.(event);
      if (!disabled) setFocused(true);
    };
    const blur: FocusEventHandler<HTMLButtonElement> = (event) => {
      onBlur?.(event);
      setFocused(false);
    };

    return (
      <BorderBeam
        active={hovered || focused}
        brightness={1.8}
        className="button-pulse"
        colorVariant="mono"
        size={variant === "primary" ? "pulse-outside" : "pulse-inner"}
        theme="dark"
      >
        <Button
          {...props}
          ref={ref}
          disabled={disabled}
          onBlur={blur}
          onFocus={focus}
          onMouseEnter={activate}
          onMouseLeave={deactivate}
          variant={variant}
        />
      </BorderBeam>
    );
  },
);
PulseButton.displayName = "PulseButton";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "warning" | "private" | "accent";
  className?: string;
}) {
  return <span className={cn("badge", `badge-${tone}`, className)}>{children}</span>;
}

export function Avatar({
  initials,
  accent = "clay",
  size = "md",
}: {
  initials: string;
  accent?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  return (
    <span className={cn("avatar", `avatar-${size}`, `avatar-${accent}`)} aria-hidden="true">
      {initials}
    </span>
  );
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content className={cn("dialog-content", wide && "dialog-wide")}>
          <div className="dialog-heading">
            <div>
              <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description>{description}</DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close className="dialog-close" aria-label="Close dialog">
              <XIcon size={18} weight="bold" />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Field({
  label,
  htmlFor,
  helper,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  helper?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {helper ? <span className="field-helper">{helper}</span> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}

export function DividerLabel({ children }: { children: ReactNode }) {
  return (
    <div className="divider-label">
      <span>{children}</span>
    </div>
  );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton", className)} {...props} />;
}
