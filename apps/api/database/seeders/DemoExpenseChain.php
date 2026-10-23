<?php

namespace Database\Seeders;

use App\Domain\Budgets\Models\BudgetLine;
use App\Domain\Expenses\Actions\SaveExpense;
use App\Domain\Expenses\Enums\ExpenseStatus;
use App\Domain\Expenses\Models\Expense;
use App\Domain\Projects\Models\Project;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * Writes demo expenses at a given point of the approval chain
 * (coordinator submits → accountant reviews → director approves).
 */
final class DemoExpenseChain
{
    private const INVOICE = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n";

    private int $sequence = 0;

    public function __construct(
        private readonly int $coordinator,
        private readonly int $accountant,
        private readonly int $director,
    ) {}

    /** @param  list<array{BudgetLine, int}>  $split */
    public function approved(Project $project, array $split, string $description, int $amount, string $spentOn, ?string $payee = null): void
    {
        $on = Carbon::parse($spentOn);
        $this->write($project, $split, $description, $amount, $spentOn, $payee, ExpenseStatus::Approved, [
            'reviewed_by' => $this->accountant, 'reviewed_at' => $on->copy()->addDay()->setTime(10, 30),
            'approved_by' => $this->director, 'approved_at' => $on->copy()->addDays(2)->setTime(9, 15),
        ]);
    }

    /** @param  list<array{BudgetLine, int}>  $split */
    public function reviewed(Project $project, array $split, string $description, int $amount, string $spentOn, ?string $payee = null): void
    {
        $this->write($project, $split, $description, $amount, $spentOn, $payee, ExpenseStatus::Reviewed, [
            'reviewed_by' => $this->accountant, 'reviewed_at' => Carbon::parse($spentOn)->addDay()->setTime(11, 0),
        ]);
    }

    /** @param  list<array{BudgetLine, int}>  $split */
    public function submitted(Project $project, array $split, string $description, int $amount, string $spentOn, ?string $payee = null): void
    {
        $this->write($project, $split, $description, $amount, $spentOn, $payee, ExpenseStatus::Submitted, []);
    }

    /** @param  list<array{BudgetLine, int}>  $split */
    public function rejected(Project $project, array $split, string $description, int $amount, string $spentOn, string $reason): void
    {
        $this->write($project, $split, $description, $amount, $spentOn, null, ExpenseStatus::Rejected, [
            'rejected_by' => $this->accountant, 'rejected_at' => Carbon::parse($spentOn)->addDay()->setTime(14, 0), 'rejection_reason' => $reason,
        ]);
    }

    /**
     * @param  list<array{BudgetLine, int}>  $split
     * @param  array<string, mixed>  $decisions
     */
    private function write(Project $project, array $split, string $description, int $amount, string $spentOn, ?string $payee, ExpenseStatus $status, array $decisions): void
    {
        $sequence = ++$this->sequence;
        $path = "organizations/{$project->organization_id}/expenses/demo-{$sequence}.pdf";
        Storage::disk(SaveExpense::DISK)->put($path, self::INVOICE);

        $expense = Expense::query()->create([
            'sequence' => $sequence,
            'project_id' => $project->id,
            'description' => $description,
            'payee' => $payee,
            'amount' => $amount * 100,
            'spent_on' => $spentOn,
            'status' => $status,
            'attachment_path' => $path,
            'attachment_name' => sprintf('facture-%04d.pdf', $sequence),
            'submitted_by' => $this->coordinator,
            ...$decisions,
        ]);
        $expense->forceFill(['created_at' => Carbon::parse($spentOn)->setTime(16, 0)])->saveQuietly();

        foreach ($split as [$line, $percent]) {
            $expense->allocations()->create(['budget_line_id' => $line->id, 'percent' => $percent]);
        }
    }
}
