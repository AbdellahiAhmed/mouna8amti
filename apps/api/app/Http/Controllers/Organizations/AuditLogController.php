<?php

namespace App\Http\Controllers\Organizations;

use App\Domain\Access\Enums\Permission;
use App\Domain\Audit\Models\AuditLog;
use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class AuditLogController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize(Permission::AuditView->value);

        $logs = AuditLog::query()
            ->with('actor')
            ->latest('created_at')
            ->latest('id')
            ->cursorPaginate(50);

        return AuditLogResource::collection($logs);
    }
}
