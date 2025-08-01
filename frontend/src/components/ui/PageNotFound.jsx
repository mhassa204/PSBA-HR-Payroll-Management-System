import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const PageNotFound = ({ 
  title = "Page Not Found",
  message = "The page you're looking for doesn't exist or has been moved.",
  showBackButton = true,
  autoRedirect = false,
  redirectDelay = 5
}) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(redirectDelay);

  useEffect(() => {
    if (autoRedirect) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            navigate('/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [autoRedirect, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="relative">
            <div className="text-8xl font-bold text-slate-200 select-none">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                <i className="fas fa-search text-blue-600 text-2xl"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            {title}
          </h1>
          
          <p className="text-slate-600 mb-8 leading-relaxed">
            {message}
          </p>

          {autoRedirect && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-blue-800 text-sm">
                <i className="fas fa-info-circle mr-2"></i>
                Redirecting to home page in <span className="font-semibold">{countdown}</span> seconds...
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
            >
              <i className="fas fa-home"></i>
              Go to Home
            </Link>

            {showBackButton && (
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors duration-200 font-medium"
              >
                <i className="fas fa-arrow-left"></i>
                Go Back
              </button>
            )}
          </div>

          {/* Helpful Links */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500 mb-4">You might be looking for:</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/employees"
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                <i className="fas fa-users mr-1"></i>
                Employees
              </Link>
              <Link
                to="/dashboard"
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                <i className="fas fa-chart-bar mr-1"></i>
                Dashboard
              </Link>
              <Link
                to="/settings"
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                <i className="fas fa-cog mr-1"></i>
                Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageNotFound;
