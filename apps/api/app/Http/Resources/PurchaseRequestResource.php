<?php

namespace App\Http\Resources;

use App\Domain\Operations\Models\PurchaseRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PurchaseRequest */
class PurchaseRequestResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number(),
            'title' => $this->title,
            'details' => $this->details,
            'supplier' => $this->supplier,
            'estimated_amount' => $this->estimated_amount,
            'needed_by' => $this->needed_by?->toDateString(),
            'status' => $this->status,
            'next' => PurchaseRequest::FLOW[$this->status],
            'project' => $this->whenLoaded('project', fn () => ['id' => $this->project->id, 'name' => $this->project->name]),
            'requested' => $this->whenLoaded('requester', fn () => ['membership_id' => $this->requested_by, 'name' => $this->requester?->user?->name, 'at' => $this->created_at?->toIso8601String()]),
            'approved' => $this->whenLoaded('approver', fn () => $this->approver === null ? null : ['membership_id' => $this->approved_by, 'name' => $this->approver->user?->name, 'at' => $this->approved_at?->toIso8601String()]),
        ];
    }
}
