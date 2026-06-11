import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Replace the console.error below with Sentry.captureException(error, { extra: info })
    // once you have added @sentry/react to the project
    console.error("[ErrorBoundary] Uncaught error:", error, info);
  }

  handleReload() {
    window.location.reload();
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-7 w-7 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-lg font-semibold text-gray-900">
            Something went wrong
          </h1>
          <p className="mb-6 text-sm text-gray-500">
            An unexpected error occurred. Please reload the page. If the
            problem persists, contact support.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Reload page
            </button>
            <a
              href="/"
              className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Go to home
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
