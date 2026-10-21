<?php

namespace Database\Seeders;

use App\Domain\Access\Enums\SystemRole;
use App\Domain\Access\Models\Role;
use App\Domain\Organizations\Actions\CreateOrganization;
use App\Domain\Organizations\Enums\MembershipStatus;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Local demo tenant. Every account shares the password below — development
 * only; never run against a production database.
 */
class DemoSeeder extends Seeder
{
    public const PASSWORD = 'Mouna8amti-demo-2026';

    /** @var array<string, array{name: string, role: SystemRole, title: string}> */
    private const TEAM = [
        'director@demo.mouna8amti.test' => ['name' => 'محمد الأمين', 'role' => SystemRole::Director, 'title' => 'المدير التنفيذي'],
        'accountant@demo.mouna8amti.test' => ['name' => 'سيدي محمد', 'role' => SystemRole::Accountant, 'title' => 'محاسب'],
        'coordinator@demo.mouna8amti.test' => ['name' => 'فاطمة بنت أحمد', 'role' => SystemRole::ProjectCoordinator, 'title' => 'منسقة المشاريع'],
        'hr@demo.mouna8amti.test' => ['name' => 'مريم عبد الله', 'role' => SystemRole::HrOfficer, 'title' => 'مسؤولة الموارد البشرية'],
        'donor@demo.mouna8amti.test' => ['name' => 'Claire Martin', 'role' => SystemRole::DonorViewer, 'title' => 'Chargée de programme'],
    ];

    public function run(CreateOrganization $createOrganization, TenantContext $tenant): void
    {
        $admin = User::query()->firstOrCreate(
            ['email' => 'admin@demo.mouna8amti.test'],
            ['name' => 'الشيخ أحمد', 'password' => self::PASSWORD, 'locale' => 'ar'],
        );

        if ($admin->memberships()->exists()) {
            return; // Already seeded.
        }

        $createOrganization->handle($admin, [
            'name' => 'منظمة الأمل للتنمية',
            'legal_name' => 'Association Al Amal pour le Développement',
            'country' => 'MR',
            'currency' => 'MRU',
            'locale' => 'ar',
            'fiscal_year_start_month' => 1,
        ]);

        foreach (self::TEAM as $email => $member) {
            $user = User::query()->create([
                'name' => $member['name'],
                'email' => $email,
                'password' => self::PASSWORD,
                'locale' => $member['role'] === SystemRole::DonorViewer ? 'fr' : 'ar',
            ]);

            $membership = Membership::query()->create([
                'user_id' => $user->id,
                'status' => MembershipStatus::Active,
                'title' => $member['title'],
            ]);
            $membership->assignRoles([(int) Role::query()->where('key', $member['role']->value)->value('id')]);
        }

        $tenant->forget();
    }
}
