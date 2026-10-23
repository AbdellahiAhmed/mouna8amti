<?php

namespace App\Http\Controllers\Expenses;

use App\Domain\Access\Enums\Permission;
use App\Domain\Expenses\Actions\ExpenseWorkflow;
use App\Domain\Expenses\Models\Expense;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Http\Resources\ExpenseResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class ExpenseDecisionController extends Controller
{
    private const RELATIONS = ['project', 'submitter.user', 'reviewer.user', 'approver.user', 'rejecter.user', 'allocations.budgetLine'];

    public function __construct(private readonly ExpenseWorkflow $workflow) {}

    public function review(string $organization, Expense $expense): ExpenseResource
    {
        Gate::authorize(Permission::ExpensesReview->value);

        return new ExpenseResource($this->workflow->review($expense, $this->membership())->load(self::RELATIONS));
    }

    public function approve(string $organization, Expense $expense): ExpenseResource
    {
        Gate::authorize(Permission::ExpensesApprove->value);

        return new ExpenseResource($this->workflow->approve($expense, $this->membership())->load(self::RELATIONS));
    }

    public function reject(Request $request, string $organization, Expense $expense): ExpenseResource
    {
        $permission = ExpenseWorkflow::permissionFor($expense)
            ?? throw new ConflictHttpException(__('This expense is not waiting for this decision.'));
        Gate::authorize($permission->value);

        $reason = $request->validate(['reason' => ['required', 'string', 'max:1000']], attributes: ['reason' => __('fields.reason')])['reason'];

        return new ExpenseResource($this->workflow->reject($expense, $this->membership(), $reason)->load(self::RELATIONS));
    }

    private function membership(): Membership
    {
        return app(TenantContext::class)->membership() ?? throw new AccessDeniedHttpException;
    }
}
