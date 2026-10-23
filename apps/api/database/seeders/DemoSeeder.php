<?php

namespace Database\Seeders;

use App\Domain\Access\Enums\SystemRole;
use App\Domain\Access\Models\Role;
use App\Domain\Budgets\Models\BudgetLine;
use App\Domain\Grants\Enums\DonorType;
use App\Domain\Grants\Models\Donor;
use App\Domain\Grants\Models\Grant;
use App\Domain\Organizations\Actions\CreateOrganization;
use App\Domain\Organizations\Enums\MembershipStatus;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Projects\Enums\ProjectStatus;
use App\Domain\Projects\Models\Project;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
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

    /**
     * Mirrors the figures of the validated design so demos and screenshots agree:
     * 16 M promised, 13 M received, 10.55 M spent; in October 14 approved
     * expenses (1.25 M), 3 waiting (340 k) and 1 rejected. Amounts below are in
     * ouguiyas; the database stores minor units.
     */
    private function seedDonorsAndProjects(): void
    {
        $seat = fn (string $email): int => (int) Membership::query()
            ->whereHas('user', fn ($q) => $q->where('email', $email))
            ->value('id');
        $coordinator = $seat('coordinator@demo.mnt.test');
        $accountant = $seat('accountant@demo.mnt.test');
        $director = $seat('director@demo.mnt.test');

        /** @var array<string, Donor> $donors */
        $donors = [];
        foreach ([
            'EU' => ['الاتحاد الأوروبي', DonorType::Multilateral, 'BE'],
            'UNICEF' => ['اليونيسف', DonorType::Multilateral, 'US'],
            'WB' => ['البنك الدولي', DonorType::Multilateral, 'US'],
            'AFD' => ['الوكالة الفرنسية للتنمية', DonorType::Bilateral, 'FR'],
            'LOCAL' => ['صندوق التنمية المحلية', DonorType::Government, 'MR'],
        ] as $key => [$name, $type, $country]) {
            $donors[$key] = Donor::query()->create(['name' => $name, 'type' => $type, 'country' => $country]);
        }

        $projects = [
            'EDU' => ['مشروع التعليم الأساسي', 'كيفة', ProjectStatus::Active, 90, '2025-09-01', '2026-12-31', 'EU', 5_000_000,
                [[2_000_000, '2026-01-15', '2026-01-15'], [1_500_000, '2026-05-01', '2026-05-10'], [1_000_000, '2026-10-01', '2026-10-06'], [500_000, '2027-01-15', null]],
                3_600_000, ['2026-02', '2026-09']],
            'HLT' => ['مشروع الصحة المجتمعية', 'نواذيبو', ProjectStatus::Active, 45, '2026-01-01', '2027-06-30', 'UNICEF', 3_500_000,
                [[2_000_000, '2026-02-01', '2026-02-01'], [1_000_000, '2026-07-01', '2026-07-03'], [500_000, '2026-12-01', null]],
                1_000_000, ['2026-03', '2026-09']],
            'WMN' => ['مشروع تمكين المرأة', 'روصو', ProjectStatus::Active, 30, '2026-03-01', '2027-12-31', 'AFD', 2_000_000,
                [[1_000_000, '2026-03-01', '2026-03-04'], [1_000_000, '2027-03-01', null]],
                400_000, ['2026-04', '2026-09']],
            'WSH' => ['مشروع المياه والصرف الصحي', 'أطار', ProjectStatus::Closed, 100, '2025-03-01', '2026-06-30', 'WB', 4_000_000,
                [[2_500_000, '2025-04-01', '2025-04-02'], [1_500_000, '2025-11-01', '2025-11-05']],
                4_000_000, ['2025-04', '2026-06']],
            'AGR' => ['مشروع الزراعة المستدامة', 'كيهيدي', ProjectStatus::OnHold, 20, '2025-09-01', '2027-08-31', 'LOCAL', 1_500_000,
                [[500_000, '2025-10-01', '2025-10-01'], [1_000_000, '2026-12-31', null]],
                300_000, ['2025-10', '2026-02']],
        ];

        /** @var array<string, list<BudgetLine>> $lines */
        $lines = [];
        foreach ($projects as $code => [$name, $location, $status, $progress, $startsOn, $endsOn, $donor, $budget, $tranches]) {
            $project = Project::query()->create([
                'code' => $code, 'name' => $name, 'location' => $location, 'status' => $status, 'progress' => $progress,
                'starts_on' => $startsOn, 'ends_on' => $endsOn, 'manager_membership_id' => $coordinator,
            ]);

            $grant = Grant::query()->create([
                'donor_id' => $donors[$donor]->id, 'project_id' => $project->id,
                'reference' => "{$donor}-{$code}-".substr($startsOn, 0, 4), 'amount' => $budget * 100, 'signed_on' => $startsOn,
            ]);
            $grant->syncTranches(array_map(
                fn (array $t) => ['amount' => $t[0] * 100, 'expected_on' => $t[1], 'received_on' => $t[2]],
                $tranches,
            ));

            foreach ([['الرواتب والأجور', 40], ['الأنشطة الميدانية', 45], ['التسيير والإدارة', 15]] as [$lineName, $share]) {
                $lines[$code][] = $project->budgetLines()->create(['name' => $lineName, 'amount' => $budget * $share]); // × 100 / 100
            }
            $projects[$code]['model'] = $project;
        }

        $chain = new DemoExpenseChain($coordinator, $accountant, $director);

        // Approved history, one expense per month across each project's active period.
        foreach ($projects as $code => $p) {
            [$from, $to] = $p[10];
            $months = [];
            for ($m = Carbon::parse("{$from}-01"); $m->format('Y-m') <= $to; $m->addMonth()) {
                $months[] = $m->copy();
            }
            foreach ($this->split($p[9], count($months)) as $i => $amount) {
                $line = $lines[$code][$i % 3];
                $chain->approved($p['model'], [[$line, 100]], "{$line->name} — ".self::MONTHS[$months[$i]->month - 1], $amount, $months[$i]->day(12)->toDateString());
            }
        }

        // October: what the director reads in the monthly report.
        foreach ([
            ['EDU', 'شراء كتب مدرسية', 'مكتبة النور', 180_000, 3, [[0, 70], [1, 30]]],
            ['EDU', 'رواتب المعلمين المتعاقدين', null, 150_000, 5, [[0, 100]]],
            ['EDU', 'نقل التلاميذ', 'شركة الساحل للنقل', 90_000, 8, [[1, 100]]],
            ['EDU', 'تجهيز الفصول الدراسية', 'مؤسسة البناء الحديث', 80_000, 11, [[1, 100]]],
            ['EDU', 'ورشة تدريب المعلمين', null, 60_000, 14, [[1, 100]]],
            ['EDU', 'لوازم مكتبية', 'مكتبة النور', 40_000, 16, [[2, 100]]],
            ['HLT', 'أدوية أساسية', 'صيدلية الشفاء', 160_000, 2, [[1, 100]]],
            ['HLT', 'رواتب الممرضين', null, 120_000, 5, [[0, 100]]],
            ['HLT', 'حملة توعية صحية', null, 70_000, 9, [[1, 100]]],
            ['HLT', 'وقود سيارة الإسعاف', 'محطة الأمل', 55_000, 13, [[2, 100]]],
            ['HLT', 'تجهيزات طبية صغيرة', 'صيدلية الشفاء', 45_000, 15, [[1, 100]]],
            ['WMN', 'تدريب على الخياطة', null, 90_000, 6, [[1, 100]]],
            ['WMN', 'معدات ورشة الخياطة', 'متجر الوفاء', 70_000, 10, [[1, 100]]],
            ['WMN', 'نقل المتدربات', 'شركة الساحل للنقل', 40_000, 12, [[2, 100]]],
        ] as [$code, $description, $payee, $amount, $day, $split]) {
            $chain->approved($projects[$code]['model'], $this->lines($lines[$code], $split), $description, $amount, sprintf('2026-10-%02d', $day), $payee);
        }

        $chain->submitted($projects['EDU']['model'], $this->lines($lines['EDU'], [[1, 100]]), 'صيانة مدرسة الحي الجديد', 150_000, '2026-10-20', 'مؤسسة البناء الحديث');
        $chain->reviewed($projects['HLT']['model'], $this->lines($lines['HLT'], [[1, 100]]), 'شراء ثلاجة لقاحات', 120_000, '2026-10-18', 'شركة المعدات الطبية');
        $chain->submitted($projects['WMN']['model'], $this->lines($lines['WMN'], [[2, 100]]), 'إيجار مقر التدريب', 70_000, '2026-10-21', 'عقارات الرمال');
        $chain->rejected($projects['HLT']['model'], $this->lines($lines['HLT'], [[2, 100]]), 'إطعام المشاركين في الحملة', 35_000, '2026-10-10', 'الفاتورة غير مختومة من المورد.');
    }

    private const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    /**
     * @param  list<BudgetLine>  $lines
     * @param  list<array{int, int}>  $split
     * @return list<array{BudgetLine, int}>
     */
    private function lines(array $lines, array $split): array
    {
        return array_map(fn (array $s) => [$lines[$s[0]], $s[1]], $split);
    }

    /**
     * Splits a total into $parts uneven amounts (rounded to 1 000) that still add up exactly.
     *
     * @return list<int>
     */
    private function split(int $total, int $parts): array
    {
        $weights = array_map(fn (int $i) => 8 + ($i * 5) % 7, range(0, $parts - 1));
        $amounts = array_map(fn (int $w) => (int) (round($total * $w / array_sum($weights) / 1000) * 1000), $weights);
        $amounts[$parts - 1] += $total - array_sum($amounts);

        return array_values($amounts);
    }
}
