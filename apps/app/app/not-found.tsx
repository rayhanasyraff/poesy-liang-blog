import Link from "next/link";

export default function NotFound() {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-[hsl(240_5%_96%)] dark:bg-[hsl(240_10%_4%)]">
          <div className="text-center px-4 max-w-lg mx-auto">
            <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Page Not Found
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              Sorry, the page you are looking for doesn't exist or has been moved.
            </p>
            <div className="space-x-4">
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Go Home
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                About
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}