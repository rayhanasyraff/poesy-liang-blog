'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-[hsl(240_5%_96%)] dark:bg-[hsl(240_10%_4%)]">
          <div className="text-center px-4 max-w-lg mx-auto">
            <h1 className="text-6xl font-bold text-red-600 mb-4">500</h1>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Something went wrong
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              An unexpected error occurred. Please try again or contact support if the problem persists.
            </p>
            <div className="space-x-4">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
              <a
                href="/"
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Go Home
              </a>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-8 text-left max-w-2xl mx-auto">
                <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded-md text-sm overflow-auto">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}