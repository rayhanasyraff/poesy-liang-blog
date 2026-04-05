<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @OA\Schema(
 *     schema="BlogVersion",
 *     type="object",
 *     @OA\Property(property="id", type="integer"),
 *     @OA\Property(property="blog_id", type="integer"),
 *     @OA\Property(property="version_number", type="integer"),
 *     @OA\Property(property="blog_title", type="string"),
 *     @OA\Property(property="blog_excerpt", type="string"),
 *     @OA\Property(property="blog_content", type="string"),
 *     @OA\Property(property="tags", type="string"),
 *     @OA\Property(property="status", type="string", enum={"draft","committed","published"}),
 *     @OA\Property(property="commit_message", type="string"),
 *     @OA\Property(property="created_at", type="string", format="datetime"),
 *     @OA\Property(property="published_at", type="string", format="datetime"),
 * )
 */
class BlogVersion extends Model
{
    protected $table = 'blog_versions';
    public $timestamps = false;

    protected $fillable = [
        'blog_id', 'parent_version_id', 'version_number', 'blog_title', 'blog_excerpt',
        'blog_content', 'tags', 'commit_message', 'status', 'created_by', 'created_at',
        'blog_visibility', 'comment_status', 'like_visibility', 'view_visibility',
        'like_count', 'view_count', 'draft_saved_at', 'published_at',
    ];

    protected $casts = [
        'blog_id'           => 'integer',
        'parent_version_id' => 'integer',
        'version_number'    => 'integer',
        'created_by'        => 'integer',
        'like_count'        => 'integer',
        'view_count'        => 'integer',
    ];

    public function blog(): BelongsTo
    {
        return $this->belongsTo(Blog::class, 'blog_id');
    }
}
