<?php

namespace Database\Factories;

use App\Domain\Organizations\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Organization>
 */
class OrganizationFactory extends Factory
{
    protected $model = Organization::class;

    public function definition(): array
    {
        return [
            'name' => 'منظمة '.fake()->unique()->word(),
            'slug' => 'org-'.Str::lower(Str::random(8)),
            'country' => 'MR',
            'currency' => 'MRU',
            'locale' => 'ar',
            'fiscal_year_start_month' => 1,
        ];
    }
}
