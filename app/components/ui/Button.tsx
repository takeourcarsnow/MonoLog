"use client";

import React from "react";

export type ButtonVariant = "default" | "danger" | "ghost" | "icon-reveal" | "icon" | "ghost-icon";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  as?: React.ElementType;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  className?: string;
}

export const Button = React.forwardRef<HTMLElement, ButtonProps>(function Button(
  { as: Tag = "button", variant = "default", size = "md", loading = false, className = "", children, ...rest },
  ref
) {
  const classes = ["btn"];
  if (variant && variant !== "default") classes.push(variant);
  if (size && size !== "md") classes.push(`btn-${size}`);
  if (loading) classes.push("loading");
  if (className) classes.push(className);

  const cls = classes.join(" ");

  const props: any = {
    className: cls,
    ...(rest as any),
  };

  // Ensure loading implies disabled
  if (loading) props.disabled = true;

  // If rendering a native button, forward the ref as HTMLButtonElement
  return (
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - polymorphic element
    <Tag ref={ref} {...props}>
      {children}
      {loading ? (
        <span className="btn-spinner" aria-hidden>
          <span />
        </span>
      ) : null}
    </Tag>
  );
});

export default Button;
