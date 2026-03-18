<?php

namespace App\Services;

use App\Models\Blog;
use App\Models\BlogVersion;
use Illuminate\Support\Facades\DB;

class VersioningService
{
    private function nowLocal(): string
    {
        return now()->toDateTimeString();
    }

    public function getLatestVersion(int $blogId): ?BlogVersion
    {
        return BlogVersion::where('blog_id', $blogId)
            ->orderByDesc('version_number')
            ->first();
    }

    private function getVersionById(int $blogId, int $versionId): ?BlogVersion
    {
        return BlogVersion::where('id', $versionId)
            ->where('blog_id', $blogId)
            ->first();
    }

    private function nextVersionNumber(int $blogId): int
    {
        return (int) BlogVersion::where('blog_id', $blogId)->max('version_number') + 1;
    }

    private function insertVersion(int $blogId, array $data): array
    {
        $nextVer = $this->nextVersionNumber($blogId);
        $status  = in_array($data['status'] ?? '', ['draft', 'committed', 'published'])
                   ? $data['status'] : 'draft';

        $version = BlogVersion::create([
            'blog_id'          => $blogId,
            'parent_version_id'=> isset($data['parent_version_id']) ? (int)$data['parent_version_id'] : null,
            'version_number'   => $nextVer,
            'blog_title'       => $data['blog_title'] ?? '',
            'blog_excerpt'     => $data['blog_excerpt'] ?? '',
            'blog_content'     => $data['blog_content'] ?? '',
            'tags'             => $data['tags'] ?? null,
            'commit_message'   => $data['commit_message'] ?? null,
            'status'           => $status,
            'created_by'       => (int)($data['created_by'] ?? 0),
            'created_at'       => $data['created_at'] ?? $this->nowLocal(),
            'blog_visibility'  => in_array($data['blog_visibility'] ?? '', ['public','private'])
                                  ? $data['blog_visibility'] : 'public',
            'comment_status'   => in_array($data['comment_status'] ?? '', ['open','close'])
                                  ? $data['comment_status'] : 'open',
            'like_visibility'  => in_array($data['like_visibility'] ?? '', ['open','close'])
                                  ? $data['like_visibility'] : 'open',
            'view_visibility'  => in_array($data['view_visibility'] ?? '', ['open','close'])
                                  ? $data['view_visibility'] : 'open',
            'like_count'       => (int)($data['like_count'] ?? 0),
            'view_count'       => (int)($data['view_count'] ?? 0),
            'draft_saved_at'   => $data['draft_saved_at'] ?? null,
            'published_at'     => $data['published_at'] ?? null,
        ]);

        return ['id' => $version->id, 'version_number' => $nextVer];
    }

    public function saveDraft(int $blogId, array $data): array
    {
        $latest = $this->getLatestVersion($blogId);
        $now    = $this->nowLocal();

        if ($latest && $latest->status === 'draft') {
            $latest->update([
                'blog_title'      => $data['blog_title'],
                'blog_content'    => $data['blog_content'],
                'blog_excerpt'    => $data['blog_excerpt'] ?? '',
                'tags'            => $data['tags'] ?? null,
                'blog_visibility' => $data['blog_visibility'] ?? $latest->blog_visibility,
                'comment_status'  => $data['comment_status']  ?? $latest->comment_status,
                'like_visibility' => $data['like_visibility'] ?? $latest->like_visibility,
                'view_visibility' => $data['view_visibility'] ?? $latest->view_visibility,
                'draft_saved_at'  => $now,
            ]);
            return ['id' => $latest->id, 'version_number' => $latest->version_number];
        }

        return $this->insertVersion($blogId, array_merge([
            'status'          => 'draft',
            'draft_saved_at'  => $now,
            'created_at'      => $now,
            'blog_visibility' => 'public',
            'comment_status'  => 'open',
            'like_visibility' => 'open',
            'view_visibility' => 'open',
        ], $data));
    }

    public function publishDraft(int $blogId, array $data): array
    {
        ['id' => $draftId, 'version_number' => $verNum] = $this->saveDraft($blogId, $data);
        $now = $this->nowLocal();

        BlogVersion::where('id', $draftId)->update([
            'status'       => 'committed',
            'published_at' => $now,
        ]);

        Blog::where('id', $blogId)->update([
            'blog_status'                  => 'published',
            'current_published_version_id' => $draftId,
            'blog_title'                   => $data['blog_title'],
            'blog_content'                 => $data['blog_content'],
            'blog_excerpt'                 => $data['blog_excerpt'] ?? '',
            'tags'                         => $data['tags'] ?? null,
            'blog_date_modified'           => $now,
            'blog_date_modified_gmt'       => $now,
        ]);

        return ['published' => ['id' => $draftId, 'version_number' => $verNum]];
    }

    public function publishSpecificVersion(int $blogId, int $versionId): void
    {
        $ver = $this->getVersionById($blogId, $versionId);
        if (!$ver) throw new \RuntimeException("Version $versionId not found for blog $blogId");

        $now = $this->nowLocal();

        BlogVersion::where('id', $versionId)->update([
            'status'       => 'committed',
            'published_at' => $now,
        ]);

        Blog::where('id', $blogId)->update([
            'blog_status'                  => 'published',
            'current_published_version_id' => $versionId,
            'blog_title'                   => $ver->blog_title,
            'blog_content'                 => $ver->blog_content,
            'blog_excerpt'                 => $ver->blog_excerpt ?? '',
            'tags'                         => $ver->tags ?? null,
            'blog_date_modified'           => $now,
            'blog_date_modified_gmt'       => $now,
        ]);
    }

    public function revertToVersion(int $blogId, int $versionId): array
    {
        $old = $this->getVersionById($blogId, $versionId);
        if (!$old) throw new \RuntimeException("Version $versionId not found for blog $blogId");

        $now = $this->nowLocal();

        return $this->insertVersion($blogId, [
            'blog_title'      => $old->blog_title,
            'blog_content'    => $old->blog_content,
            'blog_excerpt'    => $old->blog_excerpt ?? '',
            'tags'            => $old->tags ?? null,
            'status'          => 'draft',
            'draft_saved_at'  => $now,
            'blog_visibility' => $old->blog_visibility ?? 'public',
            'comment_status'  => $old->comment_status  ?? 'open',
            'like_visibility' => $old->like_visibility  ?? 'open',
            'view_visibility' => $old->view_visibility  ?? 'open',
            'created_at'      => $now,
        ]);
    }

    public function updateSettings(int $blogId, array $settings): void
    {
        $now = $this->nowLocal();
        $allowed = [
            'blog_name', 'blog_visibility', 'comment_status', 'notification_status',
            'like_visibility', 'view_visibility', 'like_count', 'view_count', 'blog_status',
        ];
        $update = array_intersect_key($settings, array_flip($allowed));
        $update['blog_date_modified']     = $now;
        $update['blog_date_modified_gmt'] = $now;
        Blog::where('id', $blogId)->update($update);
    }

    public function unpublishBlog(int $blogId): void
    {
        $now = $this->nowLocal();
        Blog::where('id', $blogId)->update([
            'blog_status'                  => 'draft',
            'current_published_version_id' => null,
            'blog_date_modified'           => $now,
            'blog_date_modified_gmt'       => $now,
        ]);
    }

    /**
     * Get latest version per blog ID, optionally filtered by status.
     * Returns [blog_id => BlogVersion]
     */
    public function getLatestVersionsForBlogs(array $blogIds, ?string $status = null): array
    {
        if (empty($blogIds)) return [];

        $ids = array_values(array_map('intval', $blogIds));

        if ($status === 'committed') {
            $statuses = ['committed', 'published'];
        } elseif ($status !== null) {
            $statuses = [$status];
        } else {
            $statuses = null;
        }

        $sub = DB::table('blog_versions as v2')
            ->selectRaw('v2.blog_id, MAX(v2.version_number) as max_ver')
            ->whereIn('v2.blog_id', $ids);

        if ($statuses) {
            $sub->whereIn('v2.status', $statuses);
        }

        $sub = $sub->groupBy('v2.blog_id');

        $query = BlogVersion::query()
            ->joinSub($sub, 'latest', function ($join) {
                $join->on('blog_versions.blog_id', '=', 'latest.blog_id')
                     ->on('blog_versions.version_number', '=', 'latest.max_ver');
            })
            ->whereIn('blog_versions.blog_id', $ids);

        if ($statuses) {
            $query->whereIn('blog_versions.status', $statuses);
        }

        $result = [];
        foreach ($query->get() as $row) {
            $result[(int)$row->blog_id] = $row;
        }
        return $result;
    }
}
