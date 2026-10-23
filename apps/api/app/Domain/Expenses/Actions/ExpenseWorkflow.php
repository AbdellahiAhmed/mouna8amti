<?php

namespace App\Domain\Expenses\Actions;

use App\Domain\Access\Enums\Permission;
use App\Domain\Expenses\Enums\ExpenseStatus;
use App\Domain\Expenses\Models\Expense;
use App\Domain\Organizations\Models\Membership;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * The approval chain: the accountant reviews the invoice, then the director
 * approves. Three different people must be involved (segregation of duties),
 * and every step re-reads the row under a lock so two decisions cannot race.
 */
final class ExpenseWorkflow
{
    public function review(Expense $expense, Membership $actor): Expense
    {
        return $this->decide($expense, ExpenseStatus::Submitted, function (Expense $locked) use ($actor): void {
            $this->ensureNotSubmitter($locked, $actor);

            if ($locked->attachment_path === null) {
                throw ValidationException::withMessages(['attachment' => __('Attach the invoice before reviewing this expense.')]);
            }

            $locked->update(['status' => ExpenseStatus::Reviewed, 'reviewed_by' => $actor->id, 'reviewed_at' => now()]);
        });
    }

    public function approve(Expense $expense, Membership $actor): Expense
    {
        return $this->decide($expense, ExpenseStatus::Reviewed, function (Expense $locked) use ($actor): void {
            $this->ensureNotSubmitter($locked, $actor);

            if ($locked->reviewed_by === $actor->id) {
                throw new ConflictHttpException(__('The final approval must come from someone other than the reviewer.'));
            }

            $locked->update(['status' => ExpenseStatus::Approved, 'approved_by' => $actor->id, 'approved_at' => now()]);
        });
    }

    public function reject(Expense $expense, Membership $actor, string $reason): Expense
    {
        return $this->decide($expense, $expense->status, function (Expense $locked) use ($actor, $reason): void {
            if (! in_array($locked->status, ExpenseStatus::pending(), true)) {
                throw new ConflictHttpException(__('This expense is not waiting for this decision.'));
            }

            $this->ensureNotSubmitter($locked, $actor);

            $locked->update([
                'status' => ExpenseStatus::Rejected,
                'rejected_by' => $actor->id,
                'rejected_at' => now(),
                'rejection_reason' => $reason,
            ]);
        });
    }

    /** The permission a decision on this expense needs right now, or null when none is possible. */
    public static function permissionFor(Expense $expense): ?Permission
    {
        return match ($expense->status) {
            ExpenseStatus::Submitted => Permission::ExpensesReview,
            ExpenseStatus::Reviewed => Permission::ExpensesApprove,
            default => null,
        };
    }

    /**
     * What the viewer may do with this expense, so the UI never guesses the rules.
     *
     * @return list<'edit'|'delete'|'review'|'approve'|'reject'>
     */
    public static function allowedActions(Expense $expense, ?Membership $viewer): array
    {
        if ($viewer === null) {
            return [];
        }

        if ($expense->submitted_by === $viewer->id) {
            return $expense->status === ExpenseStatus::Submitted ? ['edit', 'delete'] : [];
        }

        $permission = self::permissionFor($expense);

        if ($permission === null || ! $viewer->hasPermission($permission)) {
            return [];
        }

        if ($expense->status === ExpenseStatus::Reviewed && $expense->reviewed_by === $viewer->id) {
            return [];
        }

        return [$expense->status === ExpenseStatus::Submitted ? 'review' : 'approve', 'reject'];
    }

    /** @param  callable(Expense): void  $apply */
    private function decide(Expense $expense, ExpenseStatus $expected, callable $apply): Expense
    {
        return DB::transaction(function () use ($expense, $expected, $apply): Expense {
            $locked = Expense::query()->lockForUpdate()->findOrFail($expense->id);

            if ($locked->status !== $expected) {
                throw new ConflictHttpException(__('This expense is not waiting for this decision.'));
            }

            $apply($locked);

            return $locked;
        });
    }

    private function ensureNotSubmitter(Expense $expense, Membership $actor): void
    {
        if ($expense->submitted_by === $actor->id) {
            throw new ConflictHttpException(__('You cannot decide on an expense you submitted.'));
        }
    }
}
