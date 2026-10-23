<?php

namespace App\Domain\Expenses\Actions;

use App\Domain\Expenses\Enums\ExpenseStatus;
use App\Domain\Expenses\Models\Expense;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Organizations\Models\Organization;
use App\Http\Requests\Expenses\ExpenseRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Records a new expense, or corrects one that nobody has reviewed yet.
 *
 * @phpstan-import-type ExpenseData from ExpenseRequest
 */
final class SaveExpense
{
    public const DISK = 'local';

    /** @param  ExpenseData  $data */
    public function handle(Membership $submitter, array $data, ?UploadedFile $attachment = null, ?Expense $expense = null): Expense
    {
        $stored = $attachment ? $this->store($attachment, $submitter->organization_id) : null;
        $previous = $expense?->attachment_path;

        $expense = DB::transaction(function () use ($submitter, $data, $attachment, $stored, $expense): Expense {
            $fields = [
                'project_id' => $data['project_id'],
                'description' => $data['description'],
                'payee' => $data['payee'] ?? null,
                'amount' => $data['amount'],
                'spent_on' => $data['spent_on'],
                ...($stored ? ['attachment_path' => $stored, 'attachment_name' => $attachment->getClientOriginalName()] : []),
            ];

            if ($expense === null) {
                // Serialises numbering per organisation: the next sequence is read under this lock.
                Organization::query()->whereKey($submitter->organization_id)->lockForUpdate()->first();

                $expense = Expense::query()->create([
                    ...$fields,
                    'sequence' => (int) Expense::query()->max('sequence') + 1,
                    'status' => ExpenseStatus::Submitted,
                    'submitted_by' => $submitter->id,
                ]);
            } else {
                $expense->update($fields);
                $expense->allocations()->delete();
            }

            $expense->allocations()->createMany($data['allocations']);

            return $expense;
        });

        if ($stored && $previous) {
            Storage::disk(self::DISK)->delete($previous);
        }

        return $expense;
    }

    private function store(UploadedFile $file, int $organizationId): string
    {
        $name = Str::uuid()->toString().'.'.($file->guessExtension() ?? 'bin');

        return $file->storeAs("organizations/{$organizationId}/expenses", $name, self::DISK)
            ?: throw new \RuntimeException('Could not store the expense attachment.');
    }
}
