import { Component } from "react";
import { Link } from "react-router-dom";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg border border-slate-200 p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Something went wrong
              </h1>
              <p className="text-slate-600">
                We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200 text-left">
                <h3 className="text-sm font-medium text-red-800 mb-2">Error Details:</h3>
                <pre className="text-xs text-red-700 overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <i className="fas fa-refresh"></i>
                Refresh Page
              </button>
              <Link
                to="/"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors duration-200"
              >
                <i className="fas fa-home"></i>
                Go Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
