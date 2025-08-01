import { Link } from "react-router-dom";

const ErrorMessage = ({ 
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  error = null,
  onRetry = null,
  showHomeLink = true,
  className = ""
}) => {
  const getErrorMessage = () => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.response?.data?.message) return error.response.data.message;
    if (error?.response?.data?.error) return error.response.data.error;
    return message;
  };

  const getErrorCode = () => {
    if (error?.response?.status) return error.response.status;
    if (error?.status) return error.status;
    return null;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-red-200 p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <i className="fas fa-exclamation-circle text-red-600"></i>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {getErrorCode() && (
              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                {getErrorCode()}
              </span>
            )}
          </div>
          
          <p className="text-slate-600 mb-4">
            {getErrorMessage()}
          </p>

          {process.env.NODE_ENV === 'development' && error && (
            <details className="mb-4">
              <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-700">
                Technical Details
              </summary>
              <pre className="mt-2 p-3 bg-slate-50 rounded text-xs text-slate-700 overflow-auto">
                {JSON.stringify(error, null, 2)}
              </pre>
            </details>
          )}

          <div className="flex flex-wrap gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
              >
                <i className="fas fa-redo"></i>
                Try Again
              </button>
            )}
            
            {showHomeLink && (
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors duration-200 text-sm font-medium"
              >
                <i className="fas fa-home"></i>
                Go Home
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;
