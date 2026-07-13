import { Component } from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("DevTools panel error:", error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-[#282828] text-[#bdc1c6] font-mono text-sm">
          <div className="text-center">
            <p className="text-red-400 font-bold mb-2">Something went wrong</p>
            <p className="text-gray-500 text-xs">Reload the DevTools to recover.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
