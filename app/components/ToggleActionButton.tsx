"use client";

import React from "react";
import { Button } from "./Button";

type Props = {
  active: boolean;
  pending?: boolean;
  onClick?: (e?: any) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
  ariaActiveLabel?: string;
  ariaInactiveLabel?: string;
  titleActive?: string;
  titleInactive?: string;
  // Optional reveal label pattern used across the app (e.g. "Followed" / "Unfollowed")
  revealLabel?: React.ReactNode;
};

const ToggleActionButton = React.forwardRef<HTMLButtonElement, Props>(
  (
    {
      active,
      pending,
      onClick,
      size = "sm",
      className,
      activeIcon,
      inactiveIcon,
      ariaActiveLabel = "Deactivate",
      ariaInactiveLabel = "Activate",
      titleActive,
      titleInactive,
      revealLabel,
    },
    ref
  ) => {
    return (
      <Button
        ref={ref}
        variant={active ? "ghost" : "default"}
        size={size}
        className={className}
        onClick={onClick}
        disabled={!!pending}
        aria-label={active ? ariaActiveLabel : ariaInactiveLabel}
        title={active ? titleActive : titleInactive}
      >
        {/* If revealLabel is provided, keep the icon/reveal structure used elsewhere */}
        {revealLabel ? (
          <>
            <span className="icon" aria-hidden>
              {active ? activeIcon : inactiveIcon}
            </span>
            <span className="reveal label">{revealLabel}</span>
          </>
        ) : (
          (active ? activeIcon : inactiveIcon)
        )}
      </Button>
    );
  }
);

ToggleActionButton.displayName = "ToggleActionButton";

export default ToggleActionButton;
