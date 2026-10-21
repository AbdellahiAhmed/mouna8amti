<?php

namespace Database\Seeders;

use App\Domain\Access\Enums\SystemRole;
use App\Domain\Access\Models\Role;
use App\Domain\Grants\Enums\DonorType;
use App\Domain\Grants\Models\Donor;
use App\Domain\Organizations\Actions\CreateOrganization;
use App\Domain\Organizations\Enums\MembershipStatus;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Projects\Enums\ProjectStatus;
use App\Domain\Projects\Models\Project;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Local demo tenant. Every account shares the password below — development
 * only; never run against a production database.
 */
class DemoSeeder extends Seeder
{
    public const PASSWORD = 'MntDemo-2026';

    /** @var array<string, array{name: string, role: SystemRole, title: string}> */
    private const TEAM = [
        'director@demo.mnt.test' => ['name' => 'محمد الأمين', 'role' => SystemRole::Director, 'title' => 'المدير التنفيذي'],
        'accountant@demo.mnt.test' => ['name' => 'سيدي محمد', 'role' => SystemRole::Accountant, 'title' => 'محاسب'],
        'coordinator@demo.mnt.test' => ['name' => 'فاطمة بنت أحمد', 'role' => SystemRole::ProjectCoordinator, 'title' => 'منسقة المشاريع'],
        'hr@demo.mnt.test' => ['name' => 'مريم عبد الله', 'role' => SystemRole::HrOfficer, 'title' => 'مسؤولة الموارد البشرية'],
        'donor@demo.mnt.test' => ['name' => 'Claire Martin', 'role' => SystemRole::DonorViewer, 'title' => 'Chargée de programme'],
    ];

    public function run(CreateOrganization $createOrganization, TenantContext $tenant): void
    {
        // Known credentials: a stray `db:seed --force` on a real server must not create them.
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('DemoSeeder only runs in the local or testing environment.');
        }

        $admin = User::query()->firstOrCreate(
            ['email' => 'admin@demo.mnt.test'],
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

        $this->seedDonorsAndProjects();

        $tenant->forget();
    }

    private function seedDonorsAndProjects(): void
    {
        foreach ([
            ['الاتحاد الأوروبي', DonorType::Multilateral, 'BE'],
            ['برنامج الأمم المتحدة الإنمائي', DonorType::Multilateral, 'US'],
            ['البنك الدولي', DonorType::Multilateral, 'US'],
            ['الوكالة الفرنسية للتنمية', DonorType::Bilateral, 'FR'],
        ] as [$name, $type, $country]) {
            Donor::query()->create(['name' => $name, 'type' => $type, 'country' => $country]);
        }

        $coordinatorSeat = Membership::query()
            ->whereHas('user', fn ($q) => $q->where('email', 'coordinator@demo.mnt.test'))
            ->value('id');

        foreach ([
            ['EDU-26', 'مشروع التعليم الأساسي', ProjectStatus::Active, 75, '2025-01-01', '2026-12-31'],
            ['HLT-26', 'مشروع الصحة المجتمعية', ProjectStatus::Active, 41, '2025-06-01', '2027-05-31'],
            ['WMN-26', 'مشروع تمكين المرأة', ProjectStatus::Active, 30, '2026-01-01', '2027-12-31'],
            ['WSH-27', 'مشروع المياه والصرف الصحي', ProjectStatus::Draft, 0, '2027-03-01', '2028-02-28'],
            ['AGR-25', 'مشروع الزراعة المستدامة', ProjectStatus::OnHold, 17, '2024-09-01', '2026-08-31'],
        ] as [$code, $name, $status, $progress, $startsOn, $endsOn]) {
            Project::query()->create([
                'code' => $code,
                'name' => $name,
                'status' => $status,
                'progress' => $progress,
                'starts_on' => $startsOn,
                'ends_on' => $endsOn,
                'manager_membership_id' => $coordinatorSeat,
            ]);
        }
    }
}
