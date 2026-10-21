<?php

use App\Domain\Tenancy\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Not tenant-scoped by RLS: the row IS the tenant. Access is decided by
        // membership in App\Http\Middleware\ResolveOrganization.
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('legal_name')->nullable();
            $table->char('country', 2);
            $table->char('currency', 3);
            $table->string('locale', 2);
            $table->unsignedTinyInteger('fiscal_year_start_month')->default(1);
            $table->string('logo_path')->nullable();
            $table->jsonb('settings')->default('{}');
            $table->timestamps();
        });
        DB::statement('ALTER TABLE organizations ADD CONSTRAINT organizations_fiscal_month_check CHECK (fiscal_year_start_month BETWEEN 1 AND 12)');

        Schema::create('memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status', 16);
            $table->string('title')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'user_id']);
            $table->index('user_id');
        });
        DB::statement("ALTER TABLE memberships ADD CONSTRAINT memberships_status_check CHECK (status IN ('invited', 'active', 'suspended'))");
        // A user must be able to list their own memberships before choosing a tenant.
        RowLevelSecurity::enable('memberships', 'organization_id = app_current_org_id() OR user_id = app_current_user_id()');

        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('key', 64);
            $table->jsonb('name');
            $table->jsonb('permissions')->default('[]');
            $table->boolean('is_system')->default(false);
            $table->timestamps();

            $table->unique(['organization_id', 'key']);
        });
        // Members can read the role definitions of every organisation they belong to (/me).
        RowLevelSecurity::enable(
            'roles',
            'organization_id = app_current_org_id() OR organization_id IN (SELECT organization_id FROM memberships WHERE user_id = app_current_user_id())',
        );

        Schema::create('membership_role', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('membership_id')->constrained()->cascadeOnDelete();
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['membership_id', 'role_id']);
            $table->index(['organization_id', 'role_id']);
        });
        // Readable alongside the user's own memberships (role list on /me).
        RowLevelSecurity::enable(
            'membership_role',
            'organization_id = app_current_org_id() OR membership_id IN (SELECT id FROM memberships WHERE user_id = app_current_user_id())',
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('membership_role');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('memberships');
        Schema::dropIfExists('organizations');
    }
};
