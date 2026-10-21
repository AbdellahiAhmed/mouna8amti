<?php

namespace App\Http\Resources;

use App\Domain\Projects\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Project */
class ProjectResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'description' => $this->description,
            'status' => $this->status,
            'progress' => $this->progress,
            'starts_on' => $this->starts_on->toDateString(),
            'ends_on' => $this->ends_on->toDateString(),
            'manager' => $this->whenLoaded('manager', fn () => $this->manager === null ? null : [
                'membership_id' => $this->manager->id,
                'name' => $this->manager->user?->name,
            ]),
        ];
    }
}
