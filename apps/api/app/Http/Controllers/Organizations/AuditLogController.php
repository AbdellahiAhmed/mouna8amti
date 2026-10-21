<?php

namespace App\Http\Controllers\Organizations;

use App\Domain\Access\Enums\Permission;
use App\Domain\Audit\Models\AuditLog;
use App\Domain\Organizations\Models\Membership;
use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class AuditLogController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize(Permission::AuditView->value);

        $subject = $request->string('subject')->value();

        $logs = AuditLog::query()
            ->with([
                'actor',
                'auditable' => fn (MorphTo $morph) => $morph->morphWith([Membership::class => ['user']]),
            ])
            ->when(Relation::getMorphedModel($subject) !== null, fn ($query) => $query->where('auditable_type', $subject))
            ->latest('created_at')
            ->latest('id')
            ->cursorPaginate(30);

        return AuditLogResource::collection($logs);
    }
}
