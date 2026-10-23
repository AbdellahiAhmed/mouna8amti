<?php

namespace App\Http\Controllers\Operations;

use App\Domain\Access\Enums\Permission;
use App\Domain\Operations\Models\PurchaseRequest;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Organizations\Models\Organization;
use App\Domain\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Http\Resources\PurchaseRequestResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class PurchaseRequestController extends Controller
{
    private const RELATIONS = ['project', 'requester.user', 'approver.user'];

    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize(Permission::ProjectsView->value);

        $requests = PurchaseRequest::query()
            ->with(self::RELATIONS)
            ->when(in_array($request->string('status')->value(), PurchaseRequest::STATUSES, true), fn ($q) => $q->where('status', $request->string('status')->value()))
            ->latest('id')
            ->paginate(25);

        return PurchaseRequestResource::collection($requests);
    }

    public function store(Request $request, TenantContext $tenant): JsonResponse
    {
        Gate::authorize(Permission::ProcurementManage->value);
        $data = $this->validated($request, $tenant);

        $purchase = DB::transaction(function () use ($data, $tenant): PurchaseRequest {
            Organization::query()->whereKey($tenant->organizationId())->lockForUpdate()->first();

            return PurchaseRequest::query()->create([
                ...$data,
                'sequence' => (int) PurchaseRequest::query()->max('sequence') + 1,
                'status' => 'requested',
                'requested_by' => $this->membership($tenant)->id,
            ]);
        });

        return (new PurchaseRequestResource($purchase->load(self::RELATIONS)))->response()->setStatusCode(201);
    }

    public function update(Request $request, TenantContext $tenant, string $organization, PurchaseRequest $purchaseRequest): PurchaseRequestResource
    {
        Gate::authorize(Permission::ProcurementManage->value);

        if ($purchaseRequest->status !== 'requested') {
            throw new ConflictHttpException(__('Only a request that is not yet approved can be edited.'));
        }

        $purchaseRequest->update($this->validated($request, $tenant));

        return new PurchaseRequestResource($purchaseRequest->load(self::RELATIONS));
    }

    /** Moves the request along its flow; approval needs an approver who did not ask for it. */
    public function status(Request $request, TenantContext $tenant, string $organization, PurchaseRequest $purchaseRequest): PurchaseRequestResource
    {
        $next = $request->validate(['status' => ['required', Rule::in(PurchaseRequest::STATUSES)]])['status'];
        $actor = $this->membership($tenant);

        Gate::authorize($next === 'approved' ? Permission::ExpensesApprove->value : Permission::ProcurementManage->value);

        DB::transaction(function () use ($purchaseRequest, $next, $actor): void {
            $locked = PurchaseRequest::query()->lockForUpdate()->findOrFail($purchaseRequest->id);

            if (! in_array($next, PurchaseRequest::FLOW[$locked->status], true)) {
                throw new ConflictHttpException(__('This request cannot move to that step.'));
            }
            if ($next === 'approved' && $locked->requested_by === $actor->id) {
                throw new ConflictHttpException(__('You cannot approve a request you made.'));
            }

            $locked->update(['status' => $next, ...($next === 'approved' ? ['approved_by' => $actor->id, 'approved_at' => now()] : [])]);
        });

        return new PurchaseRequestResource($purchaseRequest->refresh()->load(self::RELATIONS));
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, TenantContext $tenant): array
    {
        return $request->validate([
            'project_id' => ['required', 'integer', Rule::exists('projects', 'id')->where('organization_id', $tenant->organizationId())->whereNull('deleted_at')],
            'title' => ['required', 'string', 'max:200'],
            'details' => ['nullable', 'string', 'max:5000'],
            'supplier' => ['nullable', 'string', 'max:160'],
            'estimated_amount' => ['required', 'integer', 'min:1', 'max:999999999999999'],
            'needed_by' => ['nullable', 'date'],
        ], attributes: (array) trans('fields'));
    }

    private function membership(TenantContext $tenant): Membership
    {
        return $tenant->membership() ?? throw new AccessDeniedHttpException;
    }
}
