<?php

use App\Domain\Access\Enums\SystemRole;
use App\Domain\Grants\Models\Donor;
use App\Domain\Grants\Models\Grant;
use App\Domain\Projects\Models\Project;
use App\Domain\Tenancy\TenantContext;

it('tracks project activities, editable by project managers only', function () {
    $organization = createOrganization();
    app(TenantContext::class)->enter($organization);
    $project = Project::query()->create(['code' => 'EDU', 'name' => 'التعليم', 'starts_on' => '2026-01-01', 'ends_on' => '2026-12-31', 'status' => 'active']);
    app(TenantContext::class)->forget();
    $base = "/api/orgs/{$organization->slug}";

    $this->actingAs(addMember($organization, SystemRole::Accountant))
        ->postJson("{$base}/projects/{$project->id}/activities", ['title' => 'x'])->assertForbidden();

    $id = $this->actingAs(founderOf($organization))
        ->postJson("{$base}/projects/{$project->id}/activities", ['title' => 'تدريب 40 معلمًا', 'due_on' => '2026-11-30'])
        ->assertCreated()->json('data.id');
    $this->putJson("{$base}/activities/{$id}", ['title' => 'تدريب 40 معلمًا', 'due_on' => '2026-11-30', 'done_on' => '2026-10-20'])
        ->assertOk()->assertJsonPath('data.done_on', '2026-10-20');
    $this->getJson("{$base}/projects/{$project->id}/activities")->assertJsonCount(1, 'data');
});

it('lists reports owed to donors and surfaces those due soon on the dashboard', function () {
    $organization = createOrganization();
    app(TenantContext::class)->enter($organization);
    $donor = Donor::query()->create(['name' => 'الاتحاد الأوروبي', 'type' => 'multilateral']);
    $project = Project::query()->create(['code' => 'EDU', 'name' => 'التعليم', 'starts_on' => '2026-01-01', 'ends_on' => '2026-12-31', 'status' => 'active']);
    $grant = Grant::query()->create(['donor_id' => $donor->id, 'project_id' => $project->id, 'amount' => 100]);
    app(TenantContext::class)->forget();
    $base = "/api/orgs/{$organization->slug}";
    $this->actingAs(founderOf($organization));

    $this->postJson("{$base}/grants/{$grant->id}/donor-reports", ['title' => 'التقرير المرحلي', 'due_on' => now()->addDays(20)->toDateString()])->assertCreated();
    $this->postJson("{$base}/grants/{$grant->id}/donor-reports", ['title' => 'التقرير النهائي', 'due_on' => now()->addYear()->toDateString()])->assertCreated();

    $this->getJson("{$base}/donor-reports?pending=1")->assertJsonCount(2, 'data')->assertJsonPath('data.0.donor.name', 'الاتحاد الأوروبي');
    $this->getJson("{$base}/dashboard")->assertJsonCount(1, 'data.reports_due')->assertJsonPath('data.reports_due.0.title', 'التقرير المرحلي');
});
