<?php

namespace App\Http\Resources;

use App\Domain\Budgets\Models\BudgetLine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin BudgetLine */
class BudgetLineResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'name' => $this->name,
            'amount' => $this->amount,
            'spent' => (int) ($this->spent ?? 0),
        ];
    }
}
