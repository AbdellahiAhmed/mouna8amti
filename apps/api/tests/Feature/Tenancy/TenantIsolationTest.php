<?php

use App\Domain\Access\Enums\SystemRole;
use App\Domain\Organizations\Enums\MembershipStatus;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

it('hides another organisation behind a 404', function () {
    $mine = createOrganization(name: 'Mine');
    $theirs = createOrganization(name: 'Theirs');

    $this->actingAs(founderOf($mine))
        ->getJson("/api/orgs/{$theirs->slug}/roles")
        ->assertNotFound()
        ->assertJsonPath('code', 'not_found');
});

it('answers the same 404 for an organisation that does not exist', function () {
    $mine = createOrganization();

    $this->actingAs(founderOf($mine))
        ->getJson('/api/orgs/does-not-exist/roles')
        ->assertNotFound();
});

it('refuses suspended members', function () {
    $organization = createOrganization();
    $suspended = addMember($organization, SystemRole::Director, MembershipStatus::Suspended);

    $this->actingAs($suspended)->getJson("/api/orgs/{$organization->slug}")->assertNotFound();
});

it('only lists the current organisation\'s members', function () {
    $mine = createOrganization(name: 'Mine');
    $theirs = createOrganization(name: 'Theirs');
    addMember($theirs, SystemRole::Accountant);

    $this->actingAs(founderOf($mine))
        ->getJson("/api/orgs/{$mine->slug}/members")
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

describe('row-level security, below the ORM', function () {
    it('returns no tenant rows when no organisation is entered', function () {
        createOrganization();

        expect(DB::table('roles')->count())->toBe(0)
            ->and(DB::table('audit_logs')->count())->toBe(0);
    });

    it('filters raw queries to the entered organisation', function () {
        $mine = createOrganization(name: 'Mine');
        $theirs = createOrganization(name: 'Theirs');

        app(TenantContext::class)->enter($mine);

        expect(DB::table('roles')->where('organization_id', $theirs->id)->count())->toBe(0)
            ->and(DB::table('roles')->count())->toBe(count(SystemRole::cases()));
    });

    it('rejects writes into another organisation', function () {
        $mine = createOrganization(name: 'Mine');
        $theirs = createOrganization(name: 'Theirs');

        app(TenantContext::class)->enter($mine);

        DB::table('roles')->insert([
            'organization_id' => $theirs->id,
            'key' => 'intruder',
            'name' => '{}',
            'permissions' => '[]',
        ]);
    })->throws(QueryException::class, 'row-level security');
});
