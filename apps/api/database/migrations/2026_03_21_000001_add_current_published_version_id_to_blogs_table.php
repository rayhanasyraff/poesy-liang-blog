<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddCurrentPublishedVersionIdToBlogsTable extends Migration
{
    public function up()
    {
        Schema::table('blogs', function (Blueprint $table) {
            if (!Schema::hasColumn('blogs', 'current_published_version_id')) {
                $table->unsignedBigInteger('current_published_version_id')->nullable()->after('blog_version');
            }
        });
    }

    public function down()
    {
        Schema::table('blogs', function (Blueprint $table) {
            if (Schema::hasColumn('blogs', 'current_published_version_id')) {
                $table->dropColumn('current_published_version_id');
            }
        });
    }
}
