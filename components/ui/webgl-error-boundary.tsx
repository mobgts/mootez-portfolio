"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface WebGLErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface WebGLErrorBoundaryState {
  hasError: boolean;
}

export class WebGLErrorBoundary extends Component<
  WebGLErrorBoundaryProps,
  WebGLErrorBoundaryState
> {
  state: WebGLErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("WebGL gallery failed to render", error, info);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export function WebGLFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-transparent text-[12px] tracking-[0.12em] text-muted",
        className,
      )}
      role="status"
    >
      Gallery unavailable on this device
    </div>
  );
}
