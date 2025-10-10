import type { Request, Response } from "express";
import type { WpPost } from "../types/wpPost";
import type { BlogPost } from "../types/blogPost";
import { fetchAllPoesyliangComWpPosts } from "../services/poesyliangComService";
import { fetchAllPoesyliangNetWpPosts } from "../services/poesyliangNetService";
import { insertBlog } from "../services/blogService";
import { combineAndSortBlogs } from "../utils/transform";

// Store migration summary in memory
let migrationSummary: MigrationSummary | null = null;

interface MigrationSummary {
  timestamp: string;
  total_processed: number;
  successful: number;
  failed: number;
  success_list: Array<{
    id: string;
    title: string;
    date: string;
    source: "poesyliang.com" | "poesyliang.net";
    original_id: string;
    original_data: WpPost;
    transformed_data: BlogPost;
    debug_info: {
      blog_name: string;
      blog_status: string;
      comment_status: string;
      notification_status: string;
      has_content: boolean;
      content_length: number;
    };
  }>;
  failed_list: Array<{
    title: string;
    date: string;
    source: "poesyliang.com" | "poesyliang.net";
    original_id: string;
    original_data: WpPost;
    transformed_data: BlogPost;
    error: string;
    errorDetails: string;
    debug_info: {
      blog_name: string;
      blog_status: string;
      comment_status: string;
      notification_status: string;
      has_content: boolean;
      content_length: number;
    };
  }>;
}

export async function migrateWpPostsJournalsIntoBlogs(req: Request, res: Response): Promise<void> {
  try {
    console.log("Starting migration process...");

    // Fetch all wp_posts from both sources
    console.log("Fetching wp_posts from poesyliang.com...");
    const poesyliangComWpPosts = await fetchAllPoesyliangComWpPosts();
    console.log(`Fetched ${poesyliangComWpPosts.length} wp_posts from poesyliangCom`);

    console.log("Fetching wp_posts from poesyliang.net...");
    const poesyliangNetWpPosts = await fetchAllPoesyliangNetWpPosts();
    console.log(`Fetched ${poesyliangNetWpPosts.length} wp_posts from poesyliangNet`);

    // Transform and combine
    console.log("Transforming and combining data...");
    const combinedBlogs = combineAndSortBlogs(poesyliangComWpPosts, poesyliangNetWpPosts);
    console.log(`Combined and sorted ${combinedBlogs.length} blogs`);

    // Insert blogs one by one
    const successList: MigrationSummary["success_list"] = [];
    const failedList: MigrationSummary["failed_list"] = [];
    let successCount = 0;
    let failedCount = 0;

    console.log("Starting blog insertion...");
    for (let i = 0; i < combinedBlogs.length; i++) {
      const blog = combinedBlogs[i];
      if (!blog) continue;

      console.log(`\n[${i + 1}/${combinedBlogs.length}] Inserting blog: "${blog.blog_title}"`);
      console.log(`  Source: ${blog._source}`);
      console.log(`  Original ID: ${blog._original_id}`);

      try {
        // Remove metadata before inserting
        const { _source, _original_id, _original_data, ...blogData } = blog;
        const result = await insertBlog(blogData);

        if (result.success) {
          successCount++;
          console.log(`✓ SUCCESS: Blog inserted with ID: ${result.id}`);

          successList.push({
            id: result.id!,
            title: blog.blog_title,
            date: blog.blog_date,
            source: blog._source,
            original_id: blog._original_id,
            original_data: blog._original_data,
            transformed_data: blogData,
            debug_info: {
              blog_name: blogData.blog_name,
              blog_status: blogData.blog_status,
              comment_status: blogData.comment_status,
              notification_status: blogData.notification_status,
              has_content: !!blogData.blog_content,
              content_length: blogData.blog_content.length
            }
          });
        } else {
          failedCount++;
          const errorMsg = result.message || "Unknown error";
          console.error(`✗ FAILED: ${errorMsg}`);
          console.error(`  Blog: "${blog.blog_title}"`);
          console.error(`  Source: ${blog._source}`);
          console.error(`  Original ID: ${blog._original_id}`);
          console.error(`  Date: ${blog.blog_date}`);

          failedList.push({
            title: blog.blog_title,
            date: blog.blog_date,
            source: blog._source,
            original_id: blog._original_id,
            original_data: blog._original_data,
            transformed_data: blogData,
            error: errorMsg,
            errorDetails: `Failed to insert blog "${blog.blog_title}": ${errorMsg}`,
            debug_info: {
              blog_name: blogData.blog_name,
              blog_status: blogData.blog_status,
              comment_status: blogData.comment_status,
              notification_status: blogData.notification_status,
              has_content: !!blogData.blog_content,
              content_length: blogData.blog_content.length
            }
          });
        }
      } catch (insertError) {
        failedCount++;
        const errorMsg = insertError instanceof Error ? insertError.message : String(insertError);
        const stackTrace = insertError instanceof Error ? insertError.stack : undefined;

        console.error(`✗ EXCEPTION during insertion:`);
        console.error(`  Blog: "${blog.blog_title}"`);
        console.error(`  Source: ${blog._source}`);
        console.error(`  Original ID: ${blog._original_id}`);
        console.error(`  Date: ${blog.blog_date}`);
        console.error(`  Error: ${errorMsg}`);
        if (stackTrace) {
          console.error(`  Stack: ${stackTrace}`);
        }

        const { _source, _original_id, _original_data, ...blogData } = blog;
        failedList.push({
          title: blog.blog_title,
          date: blog.blog_date,
          source: blog._source,
          original_id: blog._original_id,
          original_data: blog._original_data,
          transformed_data: blogData,
          error: errorMsg,
          errorDetails: stackTrace || errorMsg,
          debug_info: {
            blog_name: blogData.blog_name,
            blog_status: blogData.blog_status,
            comment_status: blogData.comment_status,
            notification_status: blogData.notification_status,
            has_content: !!blogData.blog_content,
            content_length: blogData.blog_content.length
          }
        });
      }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`Migration complete: ${successCount} succeeded, ${failedCount} failed`);
    console.log(`${"=".repeat(60)}`);

    // Store summary in memory
    migrationSummary = {
      timestamp: new Date().toISOString(),
      total_processed: combinedBlogs.length,
      successful: successCount,
      failed: failedCount,
      success_list: successList,
      failed_list: failedList
    };

    res.status(200).json({
      success: true,
      summary: {
        timestamp: migrationSummary.timestamp,
        total_processed: migrationSummary.total_processed,
        successful: migrationSummary.successful,
        failed: migrationSummary.failed,
        success_data: successList,
        failed_data: failedList
      }
    });
  } catch (error) {
    console.error("Error in migrateWpPostsJournalsIntoBlogs:", error);
    res.status(500).json({
      success: false,
      error: "Migration failed",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

export async function getMigrationSummary(_req: Request, res: Response): Promise<void> {
  if (!migrationSummary) {
    res.status(200).json({
      success: true,
      message: "No migration has been run yet",
      summary: null
    });
    return;
  }

  res.status(200).json({
    success: true,
    summary: migrationSummary
  });
}
