<?php

namespace App\Http\Controllers\Operations;

use App\Domain\Access\Enums\Permission;
use App\Domain\Operations\Models\Document;
use App\Domain\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Http\Resources\DocumentResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** The archive. Files live on the private disk and are only streamed to members. */
class DocumentController extends Controller
{
    private const DISK = 'local';

    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize(Permission::OperationsView->value);
        $search = $request->string('search')->trim()->value();

        $documents = Document::query()
            ->with('project')
            ->when(in_array($request->string('category')->value(), Document::CATEGORIES, true), fn ($q) => $q->where('category', $request->string('category')->value()))
            ->when($search, fn ($q) => $q->where(fn ($w) => $w->whereLike('title', "%{$search}%")->orWhereLike('reference', "%{$search}%")))
            ->orderByDesc('dated_on')
            ->orderByDesc('id')
            ->paginate(50);

        return DocumentResource::collection($documents);
    }

    /** Multipart clients send edits as POST with `_method=PATCH`. */
    public function store(Request $request, TenantContext $tenant): JsonResponse
    {
        Gate::authorize(Permission::DocumentsManage->value);
        $document = Document::query()->create([...$this->validated($request, $tenant), ...$this->storeFile($request, $tenant)]);

        return (new DocumentResource($document->load('project')))->response()->setStatusCode(201);
    }

    public function update(Request $request, TenantContext $tenant, string $organization, Document $document): DocumentResource
    {
        Gate::authorize(Permission::DocumentsManage->value);
        // A replaced scan is kept on disk: the trail must still be able to show what was filed before.
        $data = $this->validated($request, $tenant);
        $document->update([...$data, ...$this->storeFile($request, $tenant)]);

        return new DocumentResource($document->load('project'));
    }

    public function destroy(string $organization, Document $document): Response
    {
        Gate::authorize(Permission::DocumentsManage->value);
        $document->delete(); // Soft delete: the scan stays for the audit trail.

        return response()->noContent();
    }

    public function file(string $organization, Document $document): StreamedResponse
    {
        Gate::authorize(Permission::OperationsView->value);
        abort_if($document->file_path === null, 404);

        return Storage::disk(self::DISK)->download($document->file_path, $document->file_name);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, TenantContext $tenant): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'category' => ['required', Rule::in(Document::CATEGORIES)],
            'direction' => ['required', Rule::in(Document::DIRECTIONS)],
            'reference' => ['nullable', 'string', 'max:64'],
            'dated_on' => ['required', 'date'],
            'project_id' => ['nullable', 'integer', Rule::exists('projects', 'id')->where('organization_id', $tenant->organizationId())->whereNull('deleted_at')],
            'file' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx,xls,xlsx', 'max:20480'],
        ], attributes: (array) trans('fields'));
        unset($data['file']);

        return $data;
    }

    /** @return array{file_path?: string, file_name?: string} */
    private function storeFile(Request $request, TenantContext $tenant): array
    {
        $file = $request->file('file');

        if ($file === null || is_array($file)) {
            return [];
        }

        $path = $file->storeAs("organizations/{$tenant->organizationId()}/documents", Str::uuid().'.'.($file->guessExtension() ?? 'bin'), self::DISK);

        return $path === false ? [] : ['file_path' => $path, 'file_name' => $file->getClientOriginalName()];
    }
}
