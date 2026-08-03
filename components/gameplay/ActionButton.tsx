"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { type AnalyticsEvents, type AnalyticsFunnelEventName, trackFunnelEvent } from "@/lib/analytics";

type TrackedAction<Name extends AnalyticsFunnelEventName> = {
  analytics: {
    event: Name;
    properties: AnalyticsEvents[Name];
  };
  analyticsReason?: never;
};

type IntentionallyUntrackedAction = {
  analytics: false;
  /** Explain why this user-facing action is intentionally outside the funnel. */
  analyticsReason: string;
};

type ActionButtonProps<Name extends AnalyticsFunnelEventName> = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  children: ReactNode;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
} & (TrackedAction<Name> | IntentionallyUntrackedAction);

/**
 * The default button for newly added meaningful actions. Its caller must either
 * supply a typed funnel event or explicitly document why the action is not tracked.
 */
export function ActionButton<Name extends AnalyticsFunnelEventName>({
  analytics,
  analyticsReason: _analyticsReason,
  children,
  onClick,
  type = "button",
  ...buttonProps
}: ActionButtonProps<Name>) {
  return (
    <button
      {...buttonProps}
      type={type}
      onClick={(event) => {
        if (analytics !== false) void trackFunnelEvent(analytics.event, analytics.properties);
        onClick?.(event);
      }}
    >
      {children}
    </button>
  );
}
