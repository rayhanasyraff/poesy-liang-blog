<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddFingerprintToBlogLikesTable extends Migration
{
    public function up(): void
    {
        Schema::table('blog_likes', function (Blueprint $table) {
            $table->string('fingerprint', 64)->nullable()->after('ip_address');
            $table->index('fingerprint');
        });
    }

    public function down(): void
    {
        Schema::table('blog_likes', function (Blueprint $table) {
            $table->dropIndex(['fingerprint']);
            $table->dropColumn('fingerprint');
        });
    }
}
