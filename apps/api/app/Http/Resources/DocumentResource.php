<?php

namespace App\Http\Resources;

use App\Domain\Operations\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Document */
class DocumentResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'category' => $this->category,
            'direction' => $this->direction,
            'reference' => $this->reference,
            'dated_on' => $this->dated_on->toDateString(),
            'file' => $this->file_name === null ? null : ['name' => $this->file_name],
            'project' => $this->whenLoaded('project', fn () => $this->project === null ? null : ['id' => $this->project->id, 'name' => $this->project->name]),
        ];
    }
}
