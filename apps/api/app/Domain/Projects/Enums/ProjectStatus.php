<?php

namespace App\Domain\Projects\Enums;

enum ProjectStatus: string
{
    case Draft = 'draft';
    case Active = 'active';
    case OnHold = 'on_hold';
    case Closed = 'closed';
}
