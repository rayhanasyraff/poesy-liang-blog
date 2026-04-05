<?php

namespace App\Models;

use Illuminate\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Database\Eloquent\Model;
use Tymon\JWTAuth\Contracts\JWTSubject;

/**
 * @OA\Schema(
 *     schema="WpUser",
 *     type="object",
 *     @OA\Property(property="ID", type="integer"),
 *     @OA\Property(property="user_login", type="string"),
 *     @OA\Property(property="user_email", type="string"),
 *     @OA\Property(property="user_nicename", type="string"),
 *     @OA\Property(property="display_name", type="string"),
 *     @OA\Property(property="user_status", type="integer"),
 * )
 */
class WpUser extends Model implements AuthenticatableContract, JWTSubject
{
    use Authenticatable;

    protected $table      = 'wp_users';
    protected $primaryKey = 'ID';
    public $timestamps    = false;

    protected $hidden = ['user_pass'];

    protected $fillable = [
        'user_login', 'user_pass', 'user_nicename', 'user_email', 'user_url',
        'user_registered', 'user_activation_key', 'user_status', 'display_name',
    ];

    protected $casts = [
        'ID'          => 'integer',
        'user_status' => 'integer',
    ];

    // JWTSubject interface
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims(): array
    {
        return [
            'email'        => $this->user_email,
            'login'        => $this->user_login,
            'display_name' => $this->display_name,
        ];
    }

    // Authenticatable: the password field name in wp_users
    public function getAuthPassword(): string
    {
        return $this->user_pass ?? '';
    }

    public function getAuthIdentifierName(): string
    {
        return 'ID';
    }
}
