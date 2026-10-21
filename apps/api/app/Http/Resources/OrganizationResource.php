<?php

namespace App\Http\Resources;

use App\Domain\Organizations\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Organization */
class OrganizationResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'legal_name' => $this->legal_name,
            'country' => $this->country,
            'currency' => $this->currency,
            'locale' => $this->locale,
            'fiscal_year_start_month' => $this->fiscal_year_start_month,
            'logo_url' => $this->logo_path,
        ];
    }
}
