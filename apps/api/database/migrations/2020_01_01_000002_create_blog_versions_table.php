<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateBlogVersionsTable extends Migration
{
    public function up()
    {
        Schema::create('blog_versions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('blog_id');
            $table->unsignedBigInteger('parent_version_id')->nullable();
            $table->unsignedInteger('version_number')->default(1);
            $table->string('blog_title');
            $table->text('blog_excerpt')->nullable();
            $table->longText('blog_content')->nullable();
            $table->text('tags')->nullable();
            $table->string('commit_message')->nullable();
            $table->string('status', 20)->default('draft');
            $table->unsignedInteger('created_by')->default(0);
            $table->dateTime('created_at')->nullable();
            $table->string('blog_visibility', 20)->default('public');
            $table->string('comment_status', 20)->default('open');
            $table->string('like_visibility', 20)->default('open');
            $table->string('view_visibility', 20)->default('open');
            $table->unsignedInteger('like_count')->default(0);
            $table->unsignedInteger('view_count')->default(0);
            $table->dateTime('draft_saved_at')->nullable();
            $table->dateTime('published_at')->nullable();

            $table->foreign('blog_id')->references('id')->on('blogs')->onDelete('cascade');
            $table->index(['blog_id', 'version_number']);
            $table->index(['blog_id', 'status']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('blog_versions');
    }
}
