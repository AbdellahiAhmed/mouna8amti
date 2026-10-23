<?php

use App\Domain\Tenancy\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The financial spine. Every amount is a bigint in the organisation currency's
 * minor unit (1 MRU = 100), so sums are exact.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('location', 120)->nullable()->after('description');
        });

        Schema::create('grants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('donor_id')->constrained()->restrictOnDelete();
            $table->foreignId('project_id')->constrained()->restrictOnDelete();
            $table->string('reference', 64)->nullable();
            $table->bigInteger('amount');
            $table->date('signed_on')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'project_id']);
            $table->index(['organization_id', 'donor_id']);
        });
        DB::statement('ALTER TABLE grants ADD CONSTRAINT grants_amount_check CHECK (amount > 0)');
        RowLevelSecurity::enable('grants');

        Schema::create('grant_tranches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('grant_id')->constrained()->cascadeOnDelete();
            $table->bigInteger('amount');
            $table->date('expected_on');
            $table->date('received_on')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'received_on']);
        });
        DB::statement('ALTER TABLE grant_tranches ADD CONSTRAINT grant_tranches_amount_check CHECK (amount > 0)');
        RowLevelSecurity::enable('grant_tranches');

        Schema::create('budget_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('name', 160);
            $table->bigInteger('amount');
            $table->timestamps();

            $table->index(['organization_id', 'project_id']);
        });
        DB::statement('ALTER TABLE budget_lines ADD CONSTRAINT budget_lines_amount_check CHECK (amount >= 0)');
        RowLevelSecurity::enable('budget_lines');

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('sequence');
            $table->foreignId('project_id')->constrained()->restrictOnDelete();
            $table->string('description', 500);
            $table->string('payee', 160)->nullable();
            $table->bigInteger('amount');
            $table->date('spent_on');
            $table->string('status', 16);
            $table->string('attachment_path')->nullable();
            $table->string('attachment_name')->nullable();
            $table->foreignId('submitted_by')->constrained('memberships')->restrictOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('memberships')->restrictOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('memberships')->restrictOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('rejected_by')->nullable()->constrained('memberships')->restrictOnDelete();
            $table->timestamp('rejected_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'sequence']);
            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'spent_on']);
            $table->index(['organization_id', 'project_id']);
        });
        DB::statement('ALTER TABLE expenses ADD CONSTRAINT expenses_amount_check CHECK (amount > 0)');
        DB::statement("ALTER TABLE expenses ADD CONSTRAINT expenses_status_check CHECK (status IN ('submitted', 'reviewed', 'approved', 'rejected'))");
        RowLevelSecurity::enable('expenses');

        Schema::create('expense_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('expense_id')->constrained()->cascadeOnDelete();
            $table->foreignId('budget_line_id')->constrained()->restrictOnDelete();
            $table->unsignedSmallInteger('percent');

            $table->unique(['expense_id', 'budget_line_id']);
            $table->index('budget_line_id');
        });
        DB::statement('ALTER TABLE expense_allocations ADD CONSTRAINT expense_allocations_percent_check CHECK (percent BETWEEN 1 AND 100)');
        RowLevelSecurity::enable('expense_allocations');
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_allocations');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('budget_lines');
        Schema::dropIfExists('grant_tranches');
        Schema::dropIfExists('grants');

        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('location');
        });
    }
};
