<?php

use App\Domain\Tenancy\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Day-to-day operations kept deliberately simple: purchase requests, staff,
 * the asset register and the document archive. Amounts are minor units.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('sequence');
            $table->foreignId('project_id')->constrained()->restrictOnDelete();
            $table->string('title', 200);
            $table->text('details')->nullable();
            $table->string('supplier', 160)->nullable();
            $table->bigInteger('estimated_amount');
            $table->date('needed_by')->nullable();
            $table->string('status', 16);
            $table->foreignId('requested_by')->constrained('memberships')->restrictOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('memberships')->restrictOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'sequence']);
            $table->index(['organization_id', 'status']);
        });
        DB::statement("ALTER TABLE purchase_requests ADD CONSTRAINT purchase_requests_status_check CHECK (status IN ('requested', 'approved', 'ordered', 'received', 'cancelled'))");
        DB::statement('ALTER TABLE purchase_requests ADD CONSTRAINT purchase_requests_amount_check CHECK (estimated_amount > 0)');
        RowLevelSecurity::enable('purchase_requests');

        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('full_name', 160);
            $table->string('position', 160);
            $table->foreignId('project_id')->nullable()->constrained()->nullOnDelete();
            $table->string('contract_type', 16);
            $table->date('starts_on');
            $table->date('ends_on')->nullable();
            $table->bigInteger('monthly_salary')->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('email')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'full_name']);
        });
        DB::statement("ALTER TABLE employees ADD CONSTRAINT employees_contract_check CHECK (contract_type IN ('permanent', 'fixed_term', 'consultant', 'volunteer'))");
        DB::statement('ALTER TABLE employees ADD CONSTRAINT employees_dates_check CHECK (ends_on IS NULL OR ends_on >= starts_on)');
        RowLevelSecurity::enable('employees');

        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name', 160);
            $table->string('category', 16);
            $table->string('tag', 40)->nullable();
            $table->foreignId('project_id')->nullable()->constrained()->nullOnDelete();
            $table->string('location', 120)->nullable();
            $table->string('holder', 160)->nullable();
            $table->date('acquired_on')->nullable();
            $table->bigInteger('value')->nullable();
            $table->string('condition', 16);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['organization_id', 'tag']);
            $table->index(['organization_id', 'category']);
        });
        DB::statement("ALTER TABLE assets ADD CONSTRAINT assets_category_check CHECK (category IN ('vehicle', 'it', 'furniture', 'equipment', 'other'))");
        DB::statement("ALTER TABLE assets ADD CONSTRAINT assets_condition_check CHECK (condition IN ('good', 'fair', 'broken', 'disposed'))");
        RowLevelSecurity::enable('assets');

        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('title', 200);
            $table->string('category', 16);
            $table->string('direction', 16);
            $table->string('reference', 64)->nullable();
            $table->date('dated_on');
            $table->foreignId('project_id')->nullable()->constrained()->nullOnDelete();
            $table->string('file_path')->nullable();
            $table->string('file_name')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'dated_on']);
        });
        DB::statement("ALTER TABLE documents ADD CONSTRAINT documents_category_check CHECK (category IN ('contract', 'report', 'letter', 'invoice', 'other'))");
        DB::statement("ALTER TABLE documents ADD CONSTRAINT documents_direction_check CHECK (direction IN ('incoming', 'outgoing', 'internal'))");
        RowLevelSecurity::enable('documents');
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
        Schema::dropIfExists('assets');
        Schema::dropIfExists('employees');
        Schema::dropIfExists('purchase_requests');
    }
};
