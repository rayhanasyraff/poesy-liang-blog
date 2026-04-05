export default function BlogLoading() {
  return (
    <section className="mx-auto px-2 sm:px-6 lg:px-8 w-full sm:max-w-screen-lg animate-pulse">
      {/* Title */}
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4" />

      {/* Date + reading time */}
      <div className="flex gap-4 mb-8">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
      </div>

      {/* Body paragraphs */}
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
        ))}
      </div>
    </section>
  );
}
