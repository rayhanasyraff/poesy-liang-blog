<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * WordPress-compatible wp_users table.
 * Only run this migration if the table does not already exist
 * (production may already have a WordPress-managed table).
 */
class CreateWpUsersTable extends Migration
{
    public function up()
    {
        if (Schema::hasTable('wp_users')) {
            return;
        }

        Schema::create('wp_users', function (Blueprint $table) {
            $table->bigIncrements('ID');
            $table->string('user_login', 60)->default('');
            $table->string('user_pass', 255)->default('');
            $table->string('user_nicename', 50)->default('');
            $table->string('user_email', 100)->default('');
            $table->string('user_url', 100)->default('');
            $table->dateTime('user_registered')->default('0000-00-00 00:00:00');
            $table->string('user_activation_key', 255)->default('');
            $table->integer('user_status')->default(0);
            $table->string('display_name', 250)->default('');

            $table->index('user_login');
            $table->index('user_nicename');
            $table->index('user_email');
        });
    }

    public function down()
    {
        // Don't drop wp_users — it may be managed by WordPress
    }
}
