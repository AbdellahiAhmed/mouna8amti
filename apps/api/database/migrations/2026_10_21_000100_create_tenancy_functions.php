<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Session settings that Row-Level Security policies read. They are set per
 * request by App\Domain\Tenancy\TenantContext. An unset value yields NULL,
 * and NULL never equals an id, so a query without a tenant sees nothing.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION app_current_org_id() RETURNS bigint
                LANGUAGE sql STABLE
                AS $$ SELECT NULLIF(current_setting('app.org_id', true), '')::bigint $$;

            CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS bigint
                LANGUAGE sql STABLE
                AS $$ SELECT NULLIF(current_setting('app.user_id', true), '')::bigint $$;
        SQL);
    }

    public function down(): void
    {
        DB::unprepared('DROP FUNCTION IF EXISTS app_current_org_id(); DROP FUNCTION IF EXISTS app_current_user_id();');
    }
};
