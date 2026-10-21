<?php

namespace App\Domain\Grants\Enums;

enum DonorType: string
{
    case Multilateral = 'multilateral';
    case Bilateral = 'bilateral';
    case Foundation = 'foundation';
    case Government = 'government';
    case Private = 'private';
    case Other = 'other';
}
