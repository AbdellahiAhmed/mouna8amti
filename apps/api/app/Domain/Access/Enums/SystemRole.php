<?php

namespace App\Domain\Access\Enums;

use App\Domain\Access\Enums\Permission as P;

/**
 * Roles created for every new organisation. Organisations may edit their
 * permissions or add custom roles, but cannot delete these.
 */
enum SystemRole: string
{
    case Admin = 'admin';
    case Director = 'director';
    case Accountant = 'accountant';
    case ProjectCoordinator = 'project_coordinator';
    case HrOfficer = 'hr_officer';
    case Logistician = 'logistician';
    case DonorViewer = 'donor_viewer';

    /** @return array{ar: string, fr: string, en: string} */
    public function names(): array
    {
        return match ($this) {
            self::Admin => ['ar' => 'مدير النظام', 'fr' => 'Administrateur', 'en' => 'Administrator'],
            self::Director => ['ar' => 'المدير التنفيذي', 'fr' => 'Directeur', 'en' => 'Director'],
            self::Accountant => ['ar' => 'المحاسب', 'fr' => 'Comptable', 'en' => 'Accountant'],
            self::ProjectCoordinator => ['ar' => 'منسق المشاريع', 'fr' => 'Coordinateur de projet', 'en' => 'Project coordinator'],
            self::HrOfficer => ['ar' => 'مسؤول الموارد البشرية', 'fr' => 'Responsable RH', 'en' => 'HR officer'],
            self::Logistician => ['ar' => 'مسؤول اللوجستيك', 'fr' => 'Logisticien', 'en' => 'Logistician'],
            self::DonorViewer => ['ar' => 'ممثل الجهة المانحة', 'fr' => 'Bailleur (lecture)', 'en' => 'Donor viewer'],
        };
    }

    /** @return list<P> */
    public function permissions(): array
    {
        return match ($this) {
            self::Admin => P::cases(),
            self::Director => [P::AuditView, P::ProjectsView, P::ProjectsManage, P::DonorsManage, P::GrantsManage,
                P::BudgetsManage, P::ExpensesCreate, P::ExpensesApprove, P::ExpensesVoid],
            self::Accountant => [P::ProjectsView, P::GrantsManage, P::BudgetsManage, P::ExpensesCreate,
                P::ExpensesApprove, P::ExpensesPay],
            self::ProjectCoordinator => [P::ProjectsView, P::ProjectsManage, P::ExpensesCreate, P::ExpensesApprove],
            self::HrOfficer, self::Logistician => [P::ProjectsView, P::ExpensesCreate],
            self::DonorViewer => [P::ProjectsView],
        };
    }
}
