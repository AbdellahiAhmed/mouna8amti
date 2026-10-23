<?php

namespace App\Http\Resources;

use App\Domain\Grants\Models\DonorReport;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin DonorReport */
class DonorReportResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'grant_id' => $this->grant_id,
            'title' => $this->title,
            'due_on' => $this->due_on->toDateString(),
            'submitted_on' => $this->submitted_on?->toDateString(),
            'donor' => $this->whenLoaded('grant', fn () => $this->grant->relationLoaded('donor') ? ['id' => $this->grant->donor->id, 'name' => $this->grant->donor->name] : null),
            'project' => $this->whenLoaded('grant', fn () => $this->grant->relationLoaded('project') ? ['id' => $this->grant->project->id, 'name' => $this->grant->project->name] : null),
        ];
    }
}
