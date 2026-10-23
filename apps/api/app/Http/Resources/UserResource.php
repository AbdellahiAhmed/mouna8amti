<?php

namespace App\Http\Resources;

use App\Domain\Organizations\Models\Membership;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class UserResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'locale' => $this->locale,
            'avatar_url' => $this->avatar_path,
            'memberships' => MembershipResource::collection($this->whenLoaded('memberships')),
            'invitations' => $this->whenLoaded('invitations', fn () => $this->invitations->map(fn (Membership $seat) => [
                'id' => $seat->id,
                'organization' => ['name' => $seat->organization?->name, 'slug' => $seat->organization?->slug],
                'title' => $seat->title,
            ])),
        ];
    }
}
