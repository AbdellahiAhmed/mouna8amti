<?php

namespace App\Http\Resources;

use App\Domain\Expenses\Actions\ExpenseWorkflow;
use App\Domain\Expenses\Models\Expense;
use App\Domain\Expenses\Models\ExpenseAllocation;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Expense */
class ExpenseResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number(),
            'description' => $this->description,
            'payee' => $this->payee,
            'amount' => $this->amount,
            'spent_on' => $this->spent_on->toDateString(),
            'status' => $this->status,
            'project' => $this->whenLoaded('project', fn () => ['id' => $this->project->id, 'code' => $this->project->code, 'name' => $this->project->name]),
            'attachment' => $this->attachment_name === null ? null : ['name' => $this->attachment_name],
            'allocations' => $this->whenLoaded('allocations', fn () => $this->allocations->map(fn (ExpenseAllocation $a) => [
                'budget_line_id' => $a->budget_line_id,
                'name' => $a->relationLoaded('budgetLine') ? $a->budgetLine->name : null,
                'percent' => $a->percent,
            ])),
            'submitted' => $this->step('submitter', $this->created_at),
            'reviewed' => $this->step('reviewer', $this->reviewed_at),
            'approved' => $this->step('approver', $this->approved_at),
            'rejected' => $this->step('rejecter', $this->rejected_at),
            'rejection_reason' => $this->rejection_reason,
            'actions' => ExpenseWorkflow::allowedActions($this->resource, app(TenantContext::class)->membership()),
        ];
    }

    /** @return array{membership_id: int, name: string|null, at: string|null}|null */
    private function step(string $relation, mixed $at): ?array
    {
        if (! $this->relationLoaded($relation)) {
            return null;
        }

        $membership = $this->getRelation($relation);

        return $membership instanceof Membership ? [
            'membership_id' => $membership->id,
            'name' => $membership->user?->name,
            'at' => $at?->toIso8601String(),
        ] : null;
    }
}
