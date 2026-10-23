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
        // What a project must deliver, in plain words: "train 40 teachers", "repair 6 classrooms".
        Schema::create('project_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('title', 200);
            $table->date('due_on')->nullable();
            $table->date('done_on')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'project_id']);
        });
        RowLevelSecurity::enable('project_activities');

        // Reports a grant agreement obliges the organisation to send, and when.
        Schema::create('donor_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('grant_id')->constrained()->cascadeOnDelete();
            $table->string('title', 200);
            $table->date('due_on');
            $table->date('submitted_on')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'due_on']);
        });
        DB::statement('ALTER TABLE donor_reports ADD CONSTRAINT donor_reports_title_check CHECK (length(title) > 0)');
        RowLevelSecurity::enable('donor_reports');
    }

    public function down(): void
    {
        Schema::dropIfExists('donor_reports');
        Schema::dropIfExists('project_activities');
    }
};
