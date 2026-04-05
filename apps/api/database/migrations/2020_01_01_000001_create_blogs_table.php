<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateBlogsTable extends Migration
{
    public function up()
    {
        Schema::create('blogs', function (Blueprint $table) {
            $table->id();
            $table->string('blog_name')->unique();
            $table->string('blog_title');
            $table->text('blog_excerpt')->nullable();
            $table->longText('blog_content')->nullable();
            $table->string('blog_status', 20)->default('draft');
            $table->string('comment_status', 20)->default('close');
            $table->string('notification_status', 20)->default('none');
            $table->dateTime('blog_date_created')->nullable();
            $table->dateTime('blog_date_created_gmt')->nullable();
            $table->dateTime('blog_date_modified')->nullable();
            $table->dateTime('blog_date_modified_gmt')->nullable();
            $table->dateTime('blog_date_published')->nullable();
            $table->dateTime('blog_date_published_gmt')->nullable();
            $table->text('tags')->nullable();
            $table->string('blog_visibility', 20)->default('private');
            $table->unsignedInteger('like_count')->default(0);
            $table->string('like_visibility', 20)->default('close');
            $table->unsignedInteger('view_count')->default(0);
            $table->string('view_visibility', 20)->default('open');
            $table->unsignedInteger('blog_version')->default(1);
            $table->unsignedBigInteger('current_published_version_id')->nullable();

            $table->index('blog_status');
            $table->index('blog_visibility');
            $table->index('blog_date_published');
        });
    }

    public function down()
    {
        Schema::dropIfExists('blogs');
    }
}
