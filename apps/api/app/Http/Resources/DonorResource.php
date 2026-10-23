<?php

namespace App\Http\Resources;

use App\Domain\Grants\Models\Donor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Donor */
class DonorResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type,
            'country' => $this->country,
            'contact_name' => $this->contact_name,
            'contact_email' => $this->contact_email,
            'promised' => $this->when(array_key_exists('promised', $this->getAttributes()), fn () => (int) $this->promised),
            'received' => $this->when(array_key_exists('received', $this->getAttributes()), fn () => (int) $this->received),
            'grants' => GrantResource::collection($this->whenLoaded('grants')),
        ];
    }
}
