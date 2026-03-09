import type { ApiBlog, Blog } from '@/types/blog';

// Helper function to convert ApiBlog to Blog format for backward compatibility
export function convertApiBlogToBlog(apiBlog: ApiBlog): Blog {
  // Calculate reading time (approximate)
  const wordsPerMinute = 200;
  const contentText = apiBlog.blog_content || '';
  const wordCount = contentText.trim() ? contentText.split(/\s+/).filter(Boolean).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute));

  // Generate summary from blog_excerpt or content
  const summary = apiBlog.blog_excerpt && apiBlog.blog_excerpt.trim()
    ? apiBlog.blog_excerpt
    : (contentText ? contentText.substring(0, 200).replace(/<[^>]*>/g, '') + '...' : '');

  // Handle date conversion
  const getPublishedDate = (apiBlog: ApiBlog): string => {
    // Try different date fields in order of preference
    const potentialDates = [
      apiBlog.blog_date_published,
      apiBlog.blog_date_published_gmt,
      apiBlog.blog_date_modified,
      apiBlog.blog_date_modified_gmt,
      apiBlog.blog_date_created,
      apiBlog.blog_date_created_gmt,
    ];

    for (const dateCandidate of potentialDates) {
      if (dateCandidate && dateCandidate !== '0000-00-00 00:00:00' && dateCandidate.trim() !== '') {
        let dateString = dateCandidate;

        // Convert MySQL datetime format to ISO if needed
        if (dateString.includes(' ') && !dateString.includes('T')) {
          dateString = dateString.replace(' ', 'T');
          // Add Z for UTC if no timezone info
          if (!dateString.includes('+') && !dateString.includes('Z')) {
            dateString += 'Z';
          }
        }

        // Validate the date
        const testDate = new Date(dateString);
        if (!isNaN(testDate.getTime())) {
          return dateString;
        }
      }
    }

    // If no valid date found, return current date
    return new Date().toISOString();
  };

  const publishedAt = getPublishedDate(apiBlog);

  return {
    slug: apiBlog.blog_name || `blog-${apiBlog.id}`,
    metadata: {
      title: apiBlog.blog_title,
      publishedAt,
      summary,
    },
    content: apiBlog.blog_content,
    readingTime,
    like_count: apiBlog.like_count || 0,
    comment_count: 0, // Mock data - will be fetched from /blogs/{id}/comments later
    tags: apiBlog.tags || '',
    apiData: apiBlog,
  };
}
