<?php

namespace App\Http\Controllers\Expenses;

use App\Domain\Access\Enums\Permission;
use App\Domain\Expenses\Actions\SaveExpense;
use App\Domain\Expenses\Enums\ExpenseStatus;
use App\Domain\Expenses\Models\Expense;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Http\Requests\Expenses\ExpenseRequest;
use App\Http\Resources\ExpenseResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class ExpenseController extends Controller
{
    private const RELATIONS = ['project', 'submitter.user', 'reviewer.user', 'approver.user', 'rejecter.user'];

    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize(Permission::ProjectsView->value);

        $status = ExpenseStatus::tryFrom($request->string('status')->value());
        $month = $this->month($request);

        $expenses = Expense::query()
            ->with(self::RELATIONS)
            ->when($request->string('status')->value() === 'pending', fn ($query) => $query->whereIn('status', ExpenseStatus::pending()))
            ->when($status, fn ($query, ExpenseStatus $status) => $query->where('status', $status))
            ->when($request->integer('project_id'), fn ($query, int $id) => $query->where('project_id', $id))
            ->when($month, fn ($query, Carbon $month) => $query->whereBetween('spent_on', [$month->copy()->startOfMonth(), $month->copy()->endOfMonth()]))
            ->orderByDesc('spent_on')
            ->orderByDesc('id')
            ->paginate(25);

        return ExpenseResource::collection($expenses);
    }

    public function store(ExpenseRequest $request, SaveExpense $save): JsonResponse
    {
        $expense = $save->handle($this->membership(), $request->expenseData(), $request->file('attachment'));

        return (new ExpenseResource($expense->load([...self::RELATIONS, 'allocations.budgetLine'])))->response()->setStatusCode(201);
    }

    public function show(string $organization, Expense $expense): ExpenseResource
    {
        Gate::authorize(Permission::ProjectsView->value);

        return new ExpenseResource($expense->load([...self::RELATIONS, 'allocations.budgetLine']));
    }

    /** Multipart clients send POST with `_method=PATCH`, since PHP only parses files on POST. */
    public function update(ExpenseRequest $request, SaveExpense $save, string $organization, Expense $expense): ExpenseResource
    {
        $this->ensureEditable($expense);
        $expense = $save->handle($this->membership(), $request->expenseData(), $request->file('attachment'), $expense);

        return new ExpenseResource($expense->load([...self::RELATIONS, 'allocations.budgetLine']));
    }

    public function destroy(string $organization, Expense $expense): Response
    {
        $this->ensureEditable($expense);
        $path = DB::transaction(function () use ($expense): ?string {
            $locked = SaveExpense::lockEditable($expense, $this->membership());
            $locked->delete();

            return $locked->attachment_path;
        });

        if ($path !== null) {
            Storage::disk(SaveExpense::DISK)->delete($path);
        }

        return response()->noContent();
    }

    public function attachment(string $organization, Expense $expense): StreamedResponse
    {
        Gate::authorize(Permission::ProjectsView->value);
        abort_if($expense->attachment_path === null, 404);

        return Storage::disk(SaveExpense::DISK)->download($expense->attachment_path, $expense->attachment_name);
    }

    /** Only the submitter may correct or withdraw, and only before anyone has reviewed it. */
    private function ensureEditable(Expense $expense): void
    {
        if ($expense->submitted_by !== $this->membership()->id || $expense->status !== ExpenseStatus::Submitted) {
            throw new AccessDeniedHttpException;
        }
    }

    private function membership(): Membership
    {
        return app(TenantContext::class)->membership() ?? throw new AccessDeniedHttpException;
    }

    private function month(Request $request): ?Carbon
    {
        $month = $request->string('month')->value();

        return preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month) === 1 ? Carbon::createFromFormat('!Y-m', $month) : null;
    }
}
