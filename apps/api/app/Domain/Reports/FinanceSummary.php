<?php

namespace App\Domain\Reports;

use App\Domain\Access\Enums\Permission;
use App\Domain\Expenses\Enums\ExpenseStatus;
use App\Domain\Expenses\Models\Expense;
use App\Domain\Grants\Models\Grant;
use App\Domain\Grants\Models\GrantTranche;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Projects\Models\Project;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * The figures behind the dashboard and the monthly report. "Spent" always means
 * approved expenses, by the date the money was spent; "received" means grant
 * tranches marked received, by the date they arrived.
 */
final class FinanceSummary
{
    /** @return array<string, mixed> */
    public function dashboard(?Membership $viewer): array
    {
        $received = $this->received();
        $spent = $this->spent();
        $pending = Expense::query()->whereIn('status', ExpenseStatus::pending());

        return [
            'totals' => [
                'promised' => (int) Grant::query()->sum('amount'),
                'received' => $received,
                'spent' => $spent,
                'balance' => $received - $spent,
                'pending' => ['count' => (clone $pending)->count(), 'amount' => (int) (clone $pending)->sum('amount')],
            ],
            'awaiting_me' => $this->awaiting($viewer),
            'projects' => Project::query()->withFinancials()->orderBy('status')->orderBy('code')->get(),
            'recent_expenses' => Expense::query()
                ->with(['project', 'submitter.user'])
                ->latest('created_at')->latest('id')
                ->limit(5)->get(),
        ];
    }

    /** @return array<string, mixed> */
    public function month(Carbon $month): array
    {
        $from = $month->copy()->startOfMonth();
        $to = $month->copy()->endOfMonth();
        $inMonth = fn (): Builder => Expense::query()->whereBetween('spent_on', [$from, $to]);

        $tranches = GrantTranche::query()
            ->with('grant.donor')
            ->whereBetween('received_on', [$from, $to])
            ->get();

        $spentByProject = $inMonth()
            ->where('status', ExpenseStatus::Approved)
            ->with('project')
            ->get()
            ->groupBy('project_id')
            ->map(function (Collection $rows): array {
                $project = $rows->firstOrFail()->project;

                return [
                    'project' => ['id' => $project->id, 'code' => $project->code, 'name' => $project->name],
                    'amount' => (int) $rows->sum('amount'),
                    'count' => $rows->count(),
                ];
            })
            ->sortByDesc('amount')
            ->values();

        return [
            'month' => $from->format('Y-m'),
            'received' => [
                'total' => (int) $tranches->sum('amount'),
                'by_donor' => $tranches
                    ->groupBy(fn (GrantTranche $t) => $t->grant->donor_id)
                    ->map(fn (Collection $rows) => ['donor' => $rows->firstOrFail()->grant->donor->name, 'amount' => (int) $rows->sum('amount')])
                    ->sortByDesc('amount')
                    ->values(),
            ],
            'spent' => [
                'total' => array_sum(array_column($spentByProject->all(), 'amount')),
                'count' => array_sum(array_column($spentByProject->all(), 'count')),
                'by_project' => $spentByProject,
            ],
            'pending' => [
                'count' => $inMonth()->whereIn('status', ExpenseStatus::pending())->count(),
                'amount' => (int) $inMonth()->whereIn('status', ExpenseStatus::pending())->sum('amount'),
            ],
            'rejected_count' => $inMonth()->where('status', ExpenseStatus::Rejected)->count(),
            'balance_at_end' => $this->received($to) - $this->spent($to),
            'series' => $this->series($to, 6),
        ];
    }

    private function received(?Carbon $until = null): int
    {
        return (int) GrantTranche::query()
            ->whereNotNull('received_on')
            ->when($until, fn (Builder $q, Carbon $until) => $q->where('received_on', '<=', $until))
            ->sum('amount');
    }

    private function spent(?Carbon $until = null): int
    {
        return (int) Expense::query()
            ->where('status', ExpenseStatus::Approved)
            ->when($until, fn (Builder $q, Carbon $until) => $q->where('spent_on', '<=', $until))
            ->sum('amount');
    }

    /** @return list<array{month: string, received: int, spent: int}> */
    private function series(Carbon $end, int $months): array
    {
        $start = $end->copy()->startOfMonth()->subMonths($months - 1);

        $received = GrantTranche::query()
            ->whereBetween('received_on', [$start, $end])
            ->selectRaw("to_char(received_on, 'YYYY-MM') AS month, SUM(amount) AS total")
            ->groupBy('month')
            ->pluck('total', 'month');

        $spent = Expense::query()
            ->where('status', ExpenseStatus::Approved)
            ->whereBetween('spent_on', [$start, $end])
            ->selectRaw("to_char(spent_on, 'YYYY-MM') AS month, SUM(amount) AS total")
            ->groupBy('month')
            ->pluck('total', 'month');

        $series = [];

        for ($cursor = $start->copy(); $cursor <= $end; $cursor->addMonth()) {
            $key = $cursor->format('Y-m');
            $series[] = ['month' => $key, 'received' => (int) ($received[$key] ?? 0), 'spent' => (int) ($spent[$key] ?? 0)];
        }

        return $series;
    }

    /** @return array{review: int, approve: int} */
    private function awaiting(?Membership $viewer): array
    {
        if ($viewer === null) {
            return ['review' => 0, 'approve' => 0];
        }

        $others = Expense::query()->where('submitted_by', '!=', $viewer->id);

        return [
            'review' => $viewer->hasPermission(Permission::ExpensesReview)
                ? (clone $others)->where('status', ExpenseStatus::Submitted)->count() : 0,
            'approve' => $viewer->hasPermission(Permission::ExpensesApprove)
                ? (clone $others)->where('status', ExpenseStatus::Reviewed)->where('reviewed_by', '!=', $viewer->id)->count() : 0,
        ];
    }
}
