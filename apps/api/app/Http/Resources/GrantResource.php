<?php

namespace App\Http\Resources;

use App\Domain\Grants\Models\Grant;
use App\Domain\Grants\Models\GrantTranche;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Grant */
class GrantResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'amount' => $this->amount,
            'received' => $this->whenLoaded('tranches', fn () => (int) $this->tranches->whereNotNull('received_on')->sum('amount'), fn () => (int) ($this->getAttribute('received') ?? 0)),
            'signed_on' => $this->signed_on?->toDateString(),
            'donor' => $this->whenLoaded('donor', fn () => ['id' => $this->donor->id, 'name' => $this->donor->name]),
            'project' => $this->whenLoaded('project', fn () => ['id' => $this->project->id, 'code' => $this->project->code, 'name' => $this->project->name]),
            'tranches' => $this->whenLoaded('tranches', fn () => $this->tranches->map(fn (GrantTranche $t) => [
                'id' => $t->id,
                'amount' => $t->amount,
                'expected_on' => $t->expected_on->toDateString(),
                'received_on' => $t->received_on?->toDateString(),
            ])),
        ];
    }
}
