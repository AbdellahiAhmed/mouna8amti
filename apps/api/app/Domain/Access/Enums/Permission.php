<?php

namespace App\Domain\Access\Enums;

/**
 * The permission catalogue. Roles store a subset of these values; the
 * string value doubles as the Gate ability name (Gate::allows('expenses.approve')).
 */
enum Permission: string
{
    case OrganizationManage = 'organization.manage';
    case MembersView = 'members.view';
    case MembersManage = 'members.manage';
    case RolesManage = 'roles.manage';
    case AuditView = 'audit.view';

    case ProjectsView = 'projects.view';
    case ProjectsManage = 'projects.manage';
    case DonorsManage = 'donors.manage';
    case GrantsManage = 'grants.manage';
    case BudgetsManage = 'budgets.manage';

    case ExpensesCreate = 'expenses.create';
    case ExpensesReview = 'expenses.review';
    case ExpensesApprove = 'expenses.approve';
    case ExpensesPay = 'expenses.pay';
    case ExpensesVoid = 'expenses.void';

    case ProcurementManage = 'procurement.manage';
    case HrManage = 'hr.manage';
    case AssetsManage = 'assets.manage';
    case DocumentsManage = 'documents.manage';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
