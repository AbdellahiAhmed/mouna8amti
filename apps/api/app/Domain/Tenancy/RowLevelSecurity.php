<?php

namespace App\Domain\Tenancy;

use Illuminate\Support\Facades\DB;

/**
 * Migration helper. FORCE is required because the application role owns the
 * tables, and table owners bypass RLS unless it is forced.
 */
final class RowLevelSecurity
{
    public static function enable(string $table, ?string $using = null): void
    {
        $using ??= 'organization_id = app_current_org_id()';

        DB::unprepared(<<<SQL
            ALTER TABLE {$table} ENABLE ROW LEVEL SECURITY;
            ALTER TABLE {$table} FORCE ROW LEVEL SECURITY;
            CREATE POLICY tenant_isolation ON {$table}
                USING ({$using})
                WITH CHECK (organization_id = app_current_org_id());
        SQL);
    }
}
