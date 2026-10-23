<?php

use App\Domain\Access\Enums\SystemRole;
use App\Domain\Budgets\Models\BudgetLine;
use App\Domain\Expenses\Models\Expense;
use App\Domain\Organizations\Models\Organization;
use App\Domain\Projects\Models\Project;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(fn () => Storage::fake('local'));

/** @return array{0: Project, 1: BudgetLine, 2: BudgetLine} */
function projectWithLines(Organization $organization): array
{
    app(TenantContext::class)->enter($organization);
    $project = Project::query()->create([
        'code' => 'EDU', 'name' => 'التعليم', 'starts_on' => '2026-01-01', 'ends_on' => '2026-12-31', 'status' => 'active',
    ]);
    $salaries = $project->budgetLines()->create(['name' => 'الرواتب', 'amount' => 300_000_00]);
    $supplies = $project->budgetLines()->create(['name' => 'المستلزمات', 'amount' => 200_000_00]);
    app(TenantContext::class)->forget();

    return [$project, $salaries, $supplies];
}

function expensePayload(Project $project, BudgetLine $line, array $overrides = []): array
{
    return [
        'project_id' => $project->id,
        'description' => 'شراء كتب مدرسية',
        'payee' => 'مكتبة النور',
        'amount' => 120_000_00,
        'spent_on' => '2026-10-05',
        'allocations' => [['budget_line_id' => $line->id, 'percent' => 100]],
        'attachment' => UploadedFile::fake()->create('facture.pdf', 120, 'application/pdf'),
        ...$overrides,
    ];
}

/** @return array{coordinator: User, accountant: User, director: User} */
function approvalTeam(Organization $organization): array
{
    return [
        'coordinator' => addMember($organization, SystemRole::ProjectCoordinator),
        'accountant' => addMember($organization, SystemRole::Accountant),
        'director' => addMember($organization, SystemRole::Director),
    ];
}

it('runs an expense through review and approval by three different people', function () {
    $organization = createOrganization();
    [$project, $line] = projectWithLines($organization);
    $team = approvalTeam($organization);
    $base = "/api/orgs/{$organization->slug}/expenses";

    $id = $this->actingAs($team['coordinator'])->post($base, expensePayload($project, $line), ['Accept' => 'application/json'])
        ->assertCreated()
        ->assertJsonPath('data.number', 'EXP-0001')
        ->assertJsonPath('data.status', 'submitted')
        ->assertJsonPath('data.attachment.name', 'facture.pdf')
        ->assertJsonPath('data.actions', ['edit', 'delete'])
        ->json('data.id');

    $this->actingAs($team['director'])->postJson("{$base}/{$id}/approve")->assertConflict();

    $this->actingAs($team['accountant'])->getJson("{$base}/{$id}")->assertJsonPath('data.actions', ['review', 'reject']);
    $this->actingAs($team['accountant'])->postJson("{$base}/{$id}/review")
        ->assertOk()
        ->assertJsonPath('data.status', 'reviewed')
        ->assertJsonPath('data.reviewed.name', $team['accountant']->name);

    $this->actingAs($team['director'])->postJson("{$base}/{$id}/approve")
        ->assertOk()
        ->assertJsonPath('data.status', 'approved')
        ->assertJsonPath('data.approved.name', $team['director']->name)
        ->assertJsonPath('data.actions', []);

    $this->actingAs($team['director'])->getJson("/api/orgs/{$organization->slug}/projects/{$line->project_id}/budget-lines")
        ->assertJsonPath('data.0.spent', 120_000_00);
});

it('never lets the submitter decide on their own expense', function () {
    $organization = createOrganization();
    [$project, $line] = projectWithLines($organization);
    $admin = founderOf($organization); // Holds every permission.
    $base = "/api/orgs/{$organization->slug}/expenses";

    $id = $this->actingAs($admin)->post($base, expensePayload($project, $line), ['Accept' => 'application/json'])->json('data.id');

    $this->actingAs($admin)->postJson("{$base}/{$id}/review")->assertConflict();
    $this->actingAs($admin)->postJson("{$base}/{$id}/reject", ['reason' => 'x'])->assertConflict();
});

it('requires a different person for approval than for review', function () {
    $organization = createOrganization();
    [$project, $line] = projectWithLines($organization);
    $coordinator = addMember($organization, SystemRole::ProjectCoordinator);
    $admin = founderOf($organization);
    $base = "/api/orgs/{$organization->slug}/expenses";

    $id = $this->actingAs($coordinator)->post($base, expensePayload($project, $line), ['Accept' => 'application/json'])->json('data.id');
    $this->actingAs($admin)->postJson("{$base}/{$id}/review")->assertOk();

    $this->actingAs($admin)->postJson("{$base}/{$id}/approve")->assertConflict();
});

it('refuses to review an expense without its invoice', function () {
    $organization = createOrganization();
    [$project, $line] = projectWithLines($organization);
    $team = approvalTeam($organization);
    $base = "/api/orgs/{$organization->slug}/expenses";

    $id = $this->actingAs($team['coordinator'])
        ->post($base, expensePayload($project, $line, ['attachment' => null]), ['Accept' => 'application/json'])
        ->json('data.id');

    $this->actingAs($team['accountant'])->postJson("{$base}/{$id}/review")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('attachment');
});

it('rejects with a reason and locks the expense', function () {
    $organization = createOrganization();
    [$project, $line] = projectWithLines($organization);
    $team = approvalTeam($organization);
    $base = "/api/orgs/{$organization->slug}/expenses";

    $id = $this->actingAs($team['coordinator'])->post($base, expensePayload($project, $line), ['Accept' => 'application/json'])->json('data.id');

    $this->actingAs($team['accountant'])->postJson("{$base}/{$id}/reject")->assertUnprocessable()->assertJsonValidationErrors('reason');
    $this->actingAs($team['accountant'])->postJson("{$base}/{$id}/reject", ['reason' => 'الفاتورة غير واضحة'])
        ->assertOk()
        ->assertJsonPath('data.status', 'rejected')
        ->assertJsonPath('data.rejection_reason', 'الفاتورة غير واضحة');

    $this->actingAs($team['coordinator'])->deleteJson("{$base}/{$id}")->assertForbidden();
});

it('only lets reviewers and approvers act on their own step', function () {
    $organization = createOrganization();
    [$project, $line] = projectWithLines($organization);
    $team = approvalTeam($organization);
    $base = "/api/orgs/{$organization->slug}/expenses";

    $id = $this->actingAs($team['accountant'])->post($base, expensePayload($project, $line), ['Accept' => 'application/json'])->json('data.id');

    $this->actingAs($team['coordinator'])->postJson("{$base}/{$id}/review")->assertForbidden();
    $this->actingAs($team['director'])->postJson("{$base}/{$id}/review")->assertForbidden();
});

it('splits an expense across budget lines by percentage', function () {
    $organization = createOrganization();
    [$project, $salaries, $supplies] = projectWithLines($organization);
    $base = "/api/orgs/{$organization->slug}/expenses";
    $coordinator = addMember($organization, SystemRole::ProjectCoordinator);

    $split = fn (int $a, int $b) => expensePayload($project, $salaries, ['allocations' => [
        ['budget_line_id' => $salaries->id, 'percent' => $a],
        ['budget_line_id' => $supplies->id, 'percent' => $b],
    ]]);

    $this->actingAs($coordinator)->post($base, $split(60, 30), ['Accept' => 'application/json'])
        ->assertUnprocessable()->assertJsonValidationErrors('allocations');
    $this->actingAs($coordinator)->post($base, $split(60, 40), ['Accept' => 'application/json'])
        ->assertCreated()
        ->assertJsonCount(2, 'data.allocations');
});

it('refuses budget lines from another project and files that are not invoices', function () {
    $organization = createOrganization();
    [$project] = projectWithLines($organization);
    app(TenantContext::class)->enter($organization);
    $other = Project::query()->create(['code' => 'HLT', 'name' => 'الصحة', 'starts_on' => '2026-01-01', 'ends_on' => '2026-12-31', 'status' => 'active']);
    $foreignLine = $other->budgetLines()->create(['name' => 'أدوية', 'amount' => 100]);
    app(TenantContext::class)->forget();
    $coordinator = addMember($organization, SystemRole::ProjectCoordinator);
    $base = "/api/orgs/{$organization->slug}/expenses";

    $this->actingAs($coordinator)->post($base, expensePayload($project, $foreignLine), ['Accept' => 'application/json'])
        ->assertUnprocessable()->assertJsonValidationErrors('allocations');

    $this->actingAs($coordinator)
        ->post($base, expensePayload($project, $foreignLine, ['attachment' => UploadedFile::fake()->create('run.sh', 1, 'text/x-shellscript')]), ['Accept' => 'application/json'])
        ->assertUnprocessable()->assertJsonValidationErrors('attachment');
});

it('numbers expenses per organisation and keeps them isolated', function () {
    $first = createOrganization(name: 'First');
    $second = createOrganization(name: 'Second');
    [$firstProject, $firstLine] = projectWithLines($first);
    [$secondProject, $secondLine] = projectWithLines($second);

    $id = $this->actingAs(founderOf($first))
        ->post("/api/orgs/{$first->slug}/expenses", expensePayload($firstProject, $firstLine), ['Accept' => 'application/json'])
        ->assertJsonPath('data.number', 'EXP-0001')->json('data.id');
    $this->actingAs(founderOf($second))
        ->post("/api/orgs/{$second->slug}/expenses", expensePayload($secondProject, $secondLine), ['Accept' => 'application/json'])
        ->assertJsonPath('data.number', 'EXP-0001');

    $this->actingAs(founderOf($second))->getJson("/api/orgs/{$second->slug}/expenses/{$id}")->assertNotFound();
    $this->actingAs(founderOf($second))->getJson("/api/orgs/{$second->slug}/expenses/{$id}/attachment")->assertNotFound();
});

it('serves the invoice only to members and never exposes its storage path', function () {
    $organization = createOrganization();
    [$project, $line] = projectWithLines($organization);
    $admin = founderOf($organization);
    $base = "/api/orgs/{$organization->slug}/expenses";

    $response = $this->actingAs($admin)->post($base, expensePayload($project, $line), ['Accept' => 'application/json']);
    expect($response->getContent())->not->toContain('organizations/');

    $this->actingAs($admin)->get("{$base}/{$response->json('data.id')}/attachment")->assertOk()->assertDownload('facture.pdf');
    $this->actingAs(User::factory()->create())->getJson("{$base}/{$response->json('data.id')}/attachment")->assertNotFound();

    app(TenantContext::class)->enter($organization);
    Storage::disk('local')->assertExists(Expense::query()->firstOrFail()->attachment_path);
});
