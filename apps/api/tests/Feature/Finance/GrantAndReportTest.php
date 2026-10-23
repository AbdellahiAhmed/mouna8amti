<?php

use App\Domain\Access\Enums\SystemRole;
use App\Domain\Expenses\Models\Expense;
use App\Domain\Grants\Models\Donor;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Organizations\Models\Organization;
use App\Domain\Projects\Models\Project;
use App\Domain\Tenancy\TenantContext;

/** @return array{0: Donor, 1: Project} */
function donorAndProject(Organization $organization): array
{
    app(TenantContext::class)->enter($organization);
    $donor = Donor::query()->create(['name' => 'الاتحاد الأوروبي', 'type' => 'multilateral']);
    $project = Project::query()->create(['code' => 'EDU', 'name' => 'التعليم', 'starts_on' => '2026-01-01', 'ends_on' => '2026-12-31', 'status' => 'active']);
    app(TenantContext::class)->forget();

    return [$donor, $project];
}

function grantPayload(Donor $donor, Project $project, array $overrides = []): array
{
    return [
        'donor_id' => $donor->id,
        'project_id' => $project->id,
        'reference' => 'EU-EDU-2026',
        'amount' => 5_000_000_00,
        'signed_on' => '2026-01-10',
        'tranches' => [
            ['amount' => 2_000_000_00, 'expected_on' => '2026-02-01', 'received_on' => '2026-02-03'],
            ['amount' => 1_500_000_00, 'expected_on' => '2026-06-01', 'received_on' => '2026-10-02'],
            ['amount' => 1_500_000_00, 'expected_on' => '2026-12-01', 'received_on' => null],
        ],
        ...$overrides,
    ];
}

it('records a grant with its tranche schedule and edits it in place', function () {
    $organization = createOrganization();
    [$donor, $project] = donorAndProject($organization);
    $admin = founderOf($organization);

    $grant = $this->actingAs($admin)->postJson("/api/orgs/{$organization->slug}/grants", grantPayload($donor, $project))
        ->assertCreated()
        ->assertJsonPath('data.received', 3_500_000_00)
        ->assertJsonCount(3, 'data.tranches')
        ->json('data');

    // Keep the first tranche, mark the last one received, drop the middle one.
    $this->actingAs($admin)->putJson("/api/orgs/{$organization->slug}/grants/{$grant['id']}", grantPayload($donor, $project, ['tranches' => [
        ['id' => $grant['tranches'][0]['id'], 'amount' => 2_000_000_00, 'expected_on' => '2026-02-01', 'received_on' => '2026-02-03'],
        ['id' => $grant['tranches'][2]['id'], 'amount' => 1_500_000_00, 'expected_on' => '2026-12-01', 'received_on' => '2026-10-20'],
    ]]))
        ->assertOk()
        ->assertJsonCount(2, 'data.tranches')
        ->assertJsonPath('data.tranches.0.id', $grant['tranches'][0]['id'])
        ->assertJsonPath('data.received', 3_500_000_00);
});

it('refuses tranches above the grant amount and tranches of another grant', function () {
    $organization = createOrganization();
    [$donor, $project] = donorAndProject($organization);
    $admin = founderOf($organization);
    $url = "/api/orgs/{$organization->slug}/grants";

    $this->actingAs($admin)->postJson($url, grantPayload($donor, $project, ['amount' => 1_000_00]))
        ->assertUnprocessable()->assertJsonValidationErrors('tranches');

    $first = $this->actingAs($admin)->postJson($url, grantPayload($donor, $project))->json('data');
    $second = $this->actingAs($admin)->postJson($url, grantPayload($donor, $project, ['tranches' => []]))->json('data');

    $this->actingAs($admin)->putJson("{$url}/{$second['id']}", grantPayload($donor, $project, ['tranches' => [
        ['id' => $first['tranches'][0]['id'], 'amount' => 100, 'expected_on' => '2026-01-01'],
    ]]))->assertUnprocessable()->assertJsonValidationErrors('tranches.0.id');
});

it('lets only grant managers change grants', function () {
    $organization = createOrganization();
    [$donor, $project] = donorAndProject($organization);

    $this->actingAs(addMember($organization, SystemRole::ProjectCoordinator))
        ->postJson("/api/orgs/{$organization->slug}/grants", grantPayload($donor, $project))
        ->assertForbidden();
});

it('sums donors, the dashboard and the monthly report from the same figures', function () {
    $organization = createOrganization();
    [$donor, $project] = donorAndProject($organization);
    $admin = founderOf($organization);
    $this->actingAs($admin)->postJson("/api/orgs/{$organization->slug}/grants", grantPayload($donor, $project))->assertCreated();

    app(TenantContext::class)->enter($organization);
    $line = $project->budgetLines()->create(['name' => 'الرواتب', 'amount' => 5_000_000_00]);
    $seat = Membership::query()->value('id');
    foreach ([['approved', 900_000_00, '2026-10-04'], ['approved', 100_000_00, '2026-09-15'], ['submitted', 40_000_00, '2026-10-08'], ['rejected', 5_000_00, '2026-10-09']] as $i => [$status, $amount, $on]) {
        $expense = Expense::query()->create([
            'sequence' => $i + 1, 'project_id' => $project->id, 'description' => 'x', 'amount' => $amount,
            'spent_on' => $on, 'status' => $status, 'submitted_by' => $seat,
        ]);
        $expense->allocations()->create(['budget_line_id' => $line->id, 'percent' => 100]);
    }
    app(TenantContext::class)->forget();

    $this->actingAs($admin)->getJson("/api/orgs/{$organization->slug}/donors")
        ->assertJsonPath('data.0.promised', 5_000_000_00)
        ->assertJsonPath('data.0.received', 3_500_000_00);

    $this->actingAs($admin)->getJson("/api/orgs/{$organization->slug}/dashboard")
        ->assertOk()
        ->assertJsonPath('data.totals.promised', 5_000_000_00)
        ->assertJsonPath('data.totals.received', 3_500_000_00)
        ->assertJsonPath('data.totals.spent', 1_000_000_00)
        ->assertJsonPath('data.totals.balance', 2_500_000_00)
        ->assertJsonPath('data.totals.pending.count', 1)
        ->assertJsonPath('data.projects.0.budget', 5_000_000_00)
        ->assertJsonPath('data.projects.0.spent', 1_000_000_00);

    $this->actingAs($admin)->getJson("/api/orgs/{$organization->slug}/reports/monthly?month=2026-10")
        ->assertOk()
        ->assertJsonPath('data.received.total', 1_500_000_00)
        ->assertJsonPath('data.received.by_donor.0.donor', 'الاتحاد الأوروبي')
        ->assertJsonPath('data.spent.total', 900_000_00)
        ->assertJsonPath('data.pending.count', 1)
        ->assertJsonPath('data.rejected_count', 1)
        ->assertJsonPath('data.balance_at_end', 2_500_000_00)
        ->assertJsonPath('data.series.5', ['month' => '2026-10', 'received' => 1_500_000_00, 'spent' => 900_000_00]);

    $this->actingAs($admin)->getJson("/api/orgs/{$organization->slug}/reports/monthly?month=oct")->assertUnprocessable();
});
