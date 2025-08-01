const LoadingSpinner = ({ 
  size = "md", 
  color = "blue", 
  text = "Loading...",
  fullScreen = false,
  className = ""
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-12 h-12",
    xl: "w-16 h-16"
  };

  const colorClasses = {
    blue: "text-blue-600",
    slate: "text-slate-600",
    green: "text-green-600",
    red: "text-red-600",
    yellow: "text-yellow-600",
    purple: "text-purple-600"
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg", 
    xl: "text-xl"
  };

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`}>
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      {text && (
        <p className={`${textSizeClasses[size]} ${colorClasses[color]} font-medium`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-8">
          {spinner}
        </div>
      </div>
    );
  }

  return spinner;
};

// Page-level loading component
export const PageLoading = ({ 
  title = "Loading...",
  subtitle = "Please wait while we load the content"
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
        <LoadingSpinner size="xl" text="" className="mb-6" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">{title}</h2>
        <p className="text-slate-600">{subtitle}</p>
      </div>
    </div>
  );
};

// Skeleton loading for forms
export const FormSkeleton = () => {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
            <div className="h-8 bg-slate-200 rounded w-48"></div>
          </div>
          <div className="h-10 bg-slate-200 rounded w-32"></div>
        </div>
      </div>

      {/* Form sections skeleton */}
      {[1, 2, 3].map((section) => (
        <div key={section} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
              <div className="h-6 bg-slate-200 rounded w-40"></div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((field) => (
                <div key={field} className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-24"></div>
                  <div className="h-10 bg-slate-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Button skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-10 bg-slate-200 rounded w-32"></div>
        <div className="flex gap-4">
          <div className="h-10 bg-slate-200 rounded w-24"></div>
          <div className="h-10 bg-slate-200 rounded w-32"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
