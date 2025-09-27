import Link from "next/link";

export default function InternalServerError() {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-[hsl(240_5%_96%)] dark:bg-[hsl(240_10%_4%)]">
          <div className="text-center px-4 max-w-lg mx-auto">
            <h1 className="text-6xl font-bold text-red-600 mb-4">500</h1>
            <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Internal Server Error
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              Something went wrong on our end. Please try again later or contact support if the problem persists.
            </p>
            <div className="space-x-4">
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
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