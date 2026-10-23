<?php

namespace App\Http\Resources;

use App\Domain\Operations\Models\Asset;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Asset */
class AssetResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'category' => $this->category,
            'tag' => $this->tag,
            'location' => $this->location,
            'holder' => $this->holder,
            'acquired_on' => $this->acquired_on?->toDateString(),
            'value' => $this->value,
            'condition' => $this->condition,
            'project' => $this->whenLoaded('project', fn () => $this->project === null ? null : ['id' => $this->project->id, 'name' => $this->project->name]),
        ];
    }
}
