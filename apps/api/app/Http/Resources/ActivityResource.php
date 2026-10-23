<?php

namespace App\Http\Resources;

use App\Domain\Projects\Models\ProjectActivity;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ProjectActivity */
class ActivityResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'title' => $this->title,
            'due_on' => $this->due_on?->toDateString(),
            'done_on' => $this->done_on?->toDateString(),
        ];
    }
}
