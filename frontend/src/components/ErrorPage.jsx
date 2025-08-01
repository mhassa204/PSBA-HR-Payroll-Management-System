const ErrorPage = ({ title = "Error", message = "An unexpected error occurred", action }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h2 className="mt-4 text-2xl font-bold text-gray-800">{title}</h2>
        <p className="mt-2 text-gray-600">{message}</p>
        {action && (
          <button
            onClick={action.handler}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorPage;