<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateBlogLikesTable extends Migration
{
    public function up(): void
    {
        Schema::create('blog_likes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('blog_id');
            $table->string('ip_address', 45);
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['blog_id', 'ip_address']);
            $table->index('blog_id');

            $table->foreign('blog_id')->references('id')->on('blogs')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_likes');
    }
}
