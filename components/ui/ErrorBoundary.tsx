/**
 * @file components/ui/ErrorBoundary.tsx
 * React class-based error boundary for catching unhandled render-phase errors.
 *
 * Must be a class component — `getDerivedStateFromError` and `componentDidCatch`
 * are class lifecycle methods that have no hook equivalents.
 *
 * Usage: Wrap any subtree that might throw during rendering. The default fallback
 * renders a friendly "Something went wrong" screen with a "Try Again" button that
 * resets boundary state and re-mounts children. Pass a custom `fallback` prop to
 * override the default UI.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

/** Props accepted by ErrorBoundary. */
interface ErrorBoundaryProps {
  /** The React tree to protect from unhandled render errors. */
  children: React.ReactNode;
  /**
   * Optional custom fallback element rendered when an error is caught.
   * If omitted, the built-in "Something went wrong" recovery screen is shown.
   */
  fallback?: React.ReactNode;
}

/** Internal state managed by the boundary. */
interface ErrorBoundaryState {
  /** True when a render error has been caught and the fallback is visible. */
  hasError: boolean;
  /** The caught error, available for logging. Null when no error is active. */
  error: Error | null;
}

/**
 * ErrorBoundary catches unhandled errors thrown during rendering of any child
 * component. On error it renders a recovery screen rather than crashing the app.
 *
 * The "Try Again" button calls `setState({ hasError: false })`, which causes
 * React to re-render children from scratch. If the error was transient this will
 * succeed; if the component always throws, the boundary will catch again.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /**
   * Invoked during rendering when a descendant throws. Returns new state so
   * the next render shows the fallback UI rather than crashing.
   *
   * @param error - The error thrown by the descendant component.
   * @returns Updated state with `hasError: true`.
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  /**
   * Invoked after the boundary has rendered its fallback UI. Use this for
   * side-effects like logging — do not call `setState` here.
   *
   * @param error - The error that was thrown.
   * @param info - Contains `componentStack`, a string of component names
   *               leading to the component that threw.
   */
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
  }

  /** Resets boundary state so children are re-rendered. */
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Render custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default recovery screen
      return (
        <View className="flex-1 items-center justify-center px-8 bg-stone-50 dark:bg-slate-950">
          <Text className="text-4xl mb-4">⚠️</Text>
          <Text className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">
            Something went wrong
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8">
            An unexpected error occurred. Tap below to try again.
          </Text>
          <TouchableOpacity
            onPress={this.handleReset}
            className="px-8 py-3 bg-primary-500 rounded-full"
          >
            <Text className="text-white font-semibold text-base">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
