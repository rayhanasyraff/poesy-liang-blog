<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @OA\Schema(
 *     schema="Blog",
 *     type="object",
 *     @OA\Property(property="id", type="integer"),
 *     @OA\Property(property="blog_name", type="string"),
 *     @OA\Property(property="blog_title", type="string"),
 *     @OA\Property(property="blog_excerpt", type="string"),
 *     @OA\Property(property="blog_content", type="string"),
 *     @OA\Property(property="blog_status", type="string", enum={"draft","publish","published"}),
 *     @OA\Property(property="blog_visibility", type="string", enum={"public","private"}),
 *     @OA\Property(property="comment_status", type="string", enum={"open","close"}),
 *     @OA\Property(property="notification_status", type="string"),
 *     @OA\Property(property="tags", type="string"),
 *     @OA\Property(property="like_count", type="integer"),
 *     @OA\Property(property="view_count", type="integer"),
 *     @OA\Property(property="blog_date_created", type="string", format="datetime"),
 *     @OA\Property(property="blog_date_published", type="string", format="datetime"),
 * )
 */
class Blog extends Model
{
    protected $table = 'blogs';
    public $timestamps = false;

    protected $fillable = [
        'blog_name', 'blog_title', 'blog_excerpt', 'blog_content', 'blog_status',
        'comment_status', 'notification_status', 'blog_date_created', 'blog_date_created_gmt',
        'blog_date_modified', 'blog_date_modified_gmt', 'blog_date_published',
        'blog_date_published_gmt', 'tags', 'blog_visibility', 'like_count', 'like_visibility',
        'view_count', 'view_visibility', 'blog_version', 'current_published_version_id',
    ];

    protected $casts = [
        'like_count'   => 'integer',
        'view_count'   => 'integer',
        'blog_version' => 'integer',
    ];

    public function versions(): HasMany
    {
        return $this->hasMany(BlogVersion::class, 'blog_id');
    }

    public function latestVersion()
    {
        return $this->hasOne(BlogVersion::class, 'blog_id')
                    ->orderByDesc('version_number');
    }
}
