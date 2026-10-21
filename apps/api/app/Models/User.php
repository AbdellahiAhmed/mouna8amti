<?php

namespace App\Models;

use App\Domain\Organizations\Models\Membership;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;

/**
 * Global identity. Everything organisation-specific (roles, title, status)
 * lives on Membership.
 *
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string $locale
 * @property string|null $avatar_path
 * @property Carbon|null $last_login_at
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = ['name', 'email', 'password', 'locale'];

    protected $hidden = ['password', 'remember_token'];

    protected $attributes = ['locale' => 'ar'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /** @return HasMany<Membership, $this> */
    public function memberships(): HasMany
    {
        // Memberships span tenants by design; RLS still limits them to this user's rows.
        return $this->hasMany(Membership::class)->withoutGlobalScope('organization');
    }
}
