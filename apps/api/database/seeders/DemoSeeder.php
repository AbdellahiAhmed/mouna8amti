<?php

namespace Database\Seeders;

use App\Domain\Access\Enums\SystemRole;
use App\Domain\Access\Models\Role;
use App\Domain\Budgets\Models\BudgetLine;
use App\Domain\Grants\Enums\DonorType;
use App\Domain\Grants\Models\Donor;
use App\Domain\Grants\Models\Grant;
use App\Domain\Operations\Models\Asset;
use App\Domain\Operations\Models\Document;
use App\Domain\Operations\Models\Employee;
use App\Domain\Operations\Models\PurchaseRequest;
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

        $organization = $createOrganization->handle($admin, [
            'name' => 'منظمة الأمل للتنمية',
            'legal_name' => 'Association Al Amal pour le Développement',
            'country' => 'MR',
            'currency' => 'MRU',
            'locale' => 'ar',
            'fiscal_year_start_month' => 1,
        ]);
        // Stable, readable demo URLs (/ar/al-amal) instead of the generated slug.
        $organization->forceFill(['slug' => 'al-amal'])->saveQuietly();

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
            $projects[$code]['grant'] = $grant;

            foreach (self::ACTIVITIES[$code] as [$title, $due, $done]) {
                $project->activities()->create(['title' => $title, 'due_on' => $due, 'done_on' => $done]);
            }
        }

        foreach ([
            ['EDU', 'التقرير المرحلي الثالث', '2026-11-15', null],
            ['EDU', 'التقرير المرحلي الثاني', '2026-05-15', '2026-05-12'],
            ['HLT', 'تقرير نصف السنة', '2026-12-10', null],
            ['WMN', 'التقرير السنوي', '2027-02-28', null],
            ['WSH', 'التقرير الختامي', '2026-07-31', '2026-07-25'],
        ] as [$code, $title, $due, $submitted]) {
            $projects[$code]['grant']->reports()->create(['title' => $title, 'due_on' => $due, 'submitted_on' => $submitted]);
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
                // Spread across the lines in their budget shares, so no line runs over.
                $chain->approved($p['model'], $this->lines($lines[$code], [[0, 40], [1, 45], [2, 15]]), self::HISTORY[$i % count(self::HISTORY)].' — '.self::MONTHS[$months[$i]->month - 1], $amount, $months[$i]->day(12)->toDateString());
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
        $this->seedOperations($projects, $coordinator, $director);

        $chain->rejected($projects['HLT']['model'], $this->lines($lines['HLT'], [[2, 100]]), 'إطعام المشاركين في الحملة', 35_000, '2026-10-10', 'الفاتورة غير مختومة من المورد.');
    }

    /** @var array<string, list<array{string, string|null, string|null}>> */
    private const ACTIVITIES = [
        'EDU' => [
            ['تدريب 40 معلمًا على طرق التدريس الحديثة', '2026-03-31', '2026-03-20'],
            ['ترميم 6 فصول دراسية', '2026-06-30', '2026-06-18'],
            ['توزيع الكتب المدرسية على التلاميذ', '2026-09-30', '2026-09-28'],
            ['حملة التسجيل المدرسي في القرى', '2026-10-15', '2026-10-10'],
            ['تسليم المكتبات المدرسية في كيفة', '2026-11-30', null],
        ],
        'HLT' => [
            ['تجهيز 3 مراكز صحية', '2026-05-31', '2026-05-29'],
            ['تدريب 25 عاملًا صحيًا مجتمعيًا', '2026-08-31', '2026-08-20'],
            ['حملة التطعيم في القرى', '2026-12-15', null],
            ['توزيع الأدوية الأساسية', '2027-03-31', null],
        ],
        'WMN' => [
            ['اختيار 60 مستفيدة', '2026-05-31', '2026-05-15'],
            ['ورشات الخياطة والتسويق', '2026-12-31', null],
            ['تمويل 30 مشروعًا صغيرًا', '2027-06-30', null],
        ],
        'WSH' => [
            ['حفر 4 آبار', '2025-09-30', '2025-09-25'],
            ['بناء 120 مرحاضًا', '2026-03-31', '2026-03-28'],
            ['تسليم المنشآت للبلدية', '2026-06-30', '2026-06-25'],
        ],
        'AGR' => [
            ['تهيئة 10 هكتارات', '2026-01-31', '2026-01-20'],
            ['توزيع البذور والأدوات', '2026-06-30', null],
        ],
    ];

    /** @param  array<string, array<int|string, mixed>>  $projects */
    private function seedOperations(array $projects, int $coordinator, int $director): void
    {
        $id = fn (string $code): int => $projects[$code]['model']->id;

        foreach ([
            ['EDU', 'رفوف ومكتبات لـ 6 مدارس', 'مؤسسة البناء الحديث', 450_000, 'received', true],
            ['HLT', 'ثلاجة لقاحات تعمل بالطاقة الشمسية', 'شركة المعدات الطبية', 380_000, 'ordered', true],
            ['WMN', '15 ماكينة خياطة', 'متجر الوفاء', 525_000, 'approved', true],
            ['HLT', 'حقائب إسعافات أولية للعاملين الصحيين', null, 90_000, 'requested', false],
        ] as $i => [$code, $title, $supplier, $amount, $status, $approved]) {
            PurchaseRequest::query()->create([
                'sequence' => $i + 1, 'project_id' => $id($code), 'title' => $title, 'supplier' => $supplier,
                'estimated_amount' => $amount * 100, 'status' => $status, 'needed_by' => '2026-11-30',
                'requested_by' => $coordinator, ...($approved ? ['approved_by' => $director, 'approved_at' => '2026-10-02 10:00:00'] : []),
            ]);
        }

        foreach ([
            ['أحمد ولد سيدي', 'معلم متعاقد', 'EDU', 'fixed_term', '2025-09-01', '2026-12-31', 35_000],
            ['خديجة بنت محمد', 'معلمة متعاقدة', 'EDU', 'fixed_term', '2025-09-01', '2026-12-31', 35_000],
            ['أمينة سالم', 'ممرضة', 'HLT', 'fixed_term', '2026-01-15', '2027-06-30', 40_000],
            ['محمد عبد الرحمن', 'سائق', null, 'permanent', '2023-03-01', null, 28_000],
            ['زينب الشيخ', 'مدرّبة خياطة', 'WMN', 'consultant', '2026-04-01', '2026-12-31', 30_000],
            ['عائشة أحمد', 'متطوعة توعية صحية', 'HLT', 'volunteer', '2026-06-01', null, null],
        ] as [$name, $position, $code, $contract, $start, $end, $salary]) {
            Employee::query()->create([
                'full_name' => $name, 'position' => $position, 'project_id' => $code ? $id($code) : null, 'contract_type' => $contract,
                'starts_on' => $start, 'ends_on' => $end, 'monthly_salary' => $salary === null ? null : $salary * 100,
            ]);
        }

        foreach ([
            ['تويوتا هايلكس 4×4', 'vehicle', 'VEH-01', null, 'نواكشوط', 'محمد عبد الرحمن', 3_200_000, 'good'],
            ['دراجة نارية', 'vehicle', 'VEH-02', 'HLT', 'نواذيبو', 'أمينة سالم', 180_000, 'fair'],
            ['حاسوب محمول Dell', 'it', 'IT-07', 'EDU', 'كيفة', 'فاطمة بنت أحمد', 85_000, 'good'],
            ['طابعة ليزر', 'it', 'IT-08', null, 'نواكشوط', null, 40_000, 'broken'],
            ['مولد كهربائي', 'equipment', 'EQ-03', 'WMN', 'روصو', null, 260_000, 'good'],
        ] as [$name, $category, $tag, $code, $location, $holder, $value, $condition]) {
            Asset::query()->create([
                'name' => $name, 'category' => $category, 'tag' => $tag, 'project_id' => $code ? $id($code) : null,
                'location' => $location, 'holder' => $holder, 'acquired_on' => '2025-06-01', 'value' => $value * 100, 'condition' => $condition,
            ]);
        }

        foreach ([
            ['اتفاقية التمويل مع الاتحاد الأوروبي', 'contract', 'incoming', 'EU/EDU/2025-14', '2025-08-20', 'EDU'],
            ['التقرير المرحلي الثاني لمشروع التعليم', 'report', 'outgoing', 'AMAL/RPT/2026-05', '2026-05-12', 'EDU'],
            ['رسالة شكر من بلدية أطار', 'letter', 'incoming', 'ATAR/2026/88', '2026-07-02', 'WSH'],
            ['محضر اجتماع مجلس الإدارة', 'other', 'internal', 'AMAL/CA/2026-03', '2026-09-15', null],
        ] as [$title, $category, $direction, $reference, $date, $code]) {
            Document::query()->create([
                'title' => $title, 'category' => $category, 'direction' => $direction, 'reference' => $reference,
                'dated_on' => $date, 'project_id' => $code ? $id($code) : null,
            ]);
        }
    }

    private const HISTORY = ['مصاريف التشغيل الشهرية', 'رواتب الفريق وأنشطة الميدان', 'تنفيذ أنشطة المشروع'];

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
