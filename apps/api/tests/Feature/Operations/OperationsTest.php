<?php

use App\Domain\Access\Enums\SystemRole;
use App\Domain\Organizations\Models\Organization;
use App\Domain\Projects\Models\Project;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

function aProject(Organization $organization): Project
{
    app(TenantContext::class)->enter($organization);
    $project = Project::query()->create(['code' => 'EDU', 'name' => 'التعليم', 'starts_on' => '2026-01-01', 'ends_on' => '2026-12-31', 'status' => 'active']);
    app(TenantContext::class)->forget();

    return $project;
}

it('runs a purchase request from request to receipt, approved by someone else', function () {
    $organization = createOrganization();
    $project = aProject($organization);
    $logistician = addMember($organization, SystemRole::Logistician);
    $director = addMember($organization, SystemRole::Director);
    $base = "/api/orgs/{$organization->slug}/purchase-requests";

    $id = $this->actingAs($logistician)->postJson($base, [
        'project_id' => $project->id, 'title' => 'شراء 10 حواسيب', 'supplier' => 'مؤسسة التقنية', 'estimated_amount' => 1_200_000_00,
    ])->assertCreated()->assertJsonPath('data.number', 'PR-0001')->assertJsonPath('data.next', ['approved', 'cancelled'])->json('data.id');

    $this->actingAs($logistician)->postJson("{$base}/{$id}/status", ['status' => 'approved'])->assertForbidden();
    $this->actingAs($logistician)->postJson("{$base}/{$id}/status", ['status' => 'received'])->assertConflict();

    $this->actingAs($director)->postJson("{$base}/{$id}/status", ['status' => 'approved'])
        ->assertOk()->assertJsonPath('data.approved.name', $director->name);
    $this->actingAs($logistician)->putJson("{$base}/{$id}", ['project_id' => $project->id, 'title' => 'x', 'estimated_amount' => 1])->assertConflict();
    $this->actingAs($logistician)->postJson("{$base}/{$id}/status", ['status' => 'ordered'])->assertOk();
    $this->actingAs($logistician)->postJson("{$base}/{$id}/status", ['status' => 'received'])->assertOk()->assertJsonPath('data.next', []);
});

it('shows staff to the team but salaries only to HR', function () {
    $organization = createOrganization();
    $hr = addMember($organization, SystemRole::HrOfficer);
    $accountant = addMember($organization, SystemRole::Accountant);
    $base = "/api/orgs/{$organization->slug}/employees";

    $this->actingAs($accountant)->postJson($base, ['full_name' => 'x'])->assertForbidden();
    $this->actingAs($hr)->postJson($base, [
        'full_name' => 'أمينة سالم', 'position' => 'ممرضة', 'contract_type' => 'fixed_term', 'starts_on' => '2026-01-01', 'monthly_salary' => 25_000_00,
    ])->assertCreated()->assertJsonPath('data.monthly_salary', 25_000_00);

    $this->actingAs($hr)->getJson($base)->assertJsonPath('data.0.monthly_salary', 25_000_00);
    $this->actingAs($accountant)->getJson($base)->assertJsonPath('data.0.full_name', 'أمينة سالم')->assertJsonMissingPath('data.0.monthly_salary');
});

it('keeps an asset register with unique inventory tags per organisation', function () {
    $organization = createOrganization();
    $logistician = addMember($organization, SystemRole::Logistician);
    $base = "/api/orgs/{$organization->slug}/assets";
    $asset = ['name' => 'تويوتا هايلكس', 'category' => 'vehicle', 'tag' => 'VEH-01', 'condition' => 'good', 'value' => 3_000_000_00];

    $this->actingAs($logistician)->postJson($base, $asset)->assertCreated();
    $this->actingAs($logistician)->postJson($base, $asset)->assertUnprocessable()->assertJsonValidationErrors('tag');
    $this->actingAs($logistician)->getJson("{$base}?category=vehicle")->assertJsonCount(1, 'data');
});

it('archives documents with a private scan', function () {
    Storage::fake('local');
    $organization = createOrganization();
    $other = createOrganization(name: 'Other');
    $admin = founderOf($organization);
    $base = "/api/orgs/{$organization->slug}/documents";

    $id = $this->actingAs($admin)->post($base, [
        'title' => 'اتفاقية التمويل مع الاتحاد الأوروبي', 'category' => 'contract', 'direction' => 'incoming', 'reference' => 'EU/2026/14',
        'dated_on' => '2026-01-10', 'file' => UploadedFile::fake()->create('convention.pdf', 200, 'application/pdf'),
    ], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('data.file.name', 'convention.pdf')->json('data.id');

    $this->actingAs($admin)->getJson("{$base}?search=EU/2026")->assertJsonCount(1, 'data');
    $this->actingAs($admin)->get("{$base}/{$id}/file")->assertOk()->assertDownload('convention.pdf');
    $this->actingAs(founderOf($other))->getJson("/api/orgs/{$other->slug}/documents/{$id}/file")->assertNotFound();
});
