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
        Schema::create('donors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('type', 16);
            $table->char('country', 2)->nullable();
            $table->string('contact_name')->nullable();
            $table->string('contact_email')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'name']);
        });
        DB::statement("ALTER TABLE donors ADD CONSTRAINT donors_type_check CHECK (type IN ('multilateral', 'bilateral', 'foundation', 'government', 'private', 'other'))");
        RowLevelSecurity::enable('donors');

        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('code', 32);
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('manager_membership_id')->nullable()->constrained('memberships')->nullOnDelete();
            $table->date('starts_on');
            $table->date('ends_on');
            $table->string('status', 16);
            $table->unsignedTinyInteger('progress')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['organization_id', 'code']);
            $table->index(['organization_id', 'status']);
        });
        DB::statement("ALTER TABLE projects ADD CONSTRAINT projects_status_check CHECK (status IN ('draft', 'active', 'on_hold', 'closed'))");
        DB::statement('ALTER TABLE projects ADD CONSTRAINT projects_progress_check CHECK (progress BETWEEN 0 AND 100)');
        DB::statement('ALTER TABLE projects ADD CONSTRAINT projects_dates_check CHECK (ends_on >= starts_on)');
        RowLevelSecurity::enable('projects');
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
        Schema::dropIfExists('donors');
    }
};
