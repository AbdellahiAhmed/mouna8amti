<?php

namespace App\Domain\Expenses\Enums;

/**
 * submitted → reviewed (accountant checked the invoice) → approved (director).
 * Either step may reject instead.
 */
enum ExpenseStatus: string
{
    case Submitted = 'submitted';
    case Reviewed = 'reviewed';
    case Approved = 'approved';
    case Rejected = 'rejected';

    /** @return list<self> */
    public static function pending(): array
    {
        return [self::Submitted, self::Reviewed];
    }
}
