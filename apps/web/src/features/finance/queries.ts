"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/features/organization/organization-context";
import { api } from "@/lib/api";
import type {
  BudgetLine,
  Dashboard,
  Expense,
  ExpenseStatus,
  Grant,
  MonthlyReport,
  Paginated,
  Resource,
} from "@/lib/types";

function useBase() {
  return `/orgs/${useOrganization().organization.slug}`;
}

/** Money moves touch the dashboard, projects, donors and reports at once: refresh everything of this organisation. */
function useInvalidateOrganization() {
  const base = useBase();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith(base) });
}

export function useDashboard() {
  const path = `${useBase()}/dashboard`;
  return useQuery({ queryKey: [path], queryFn: () => api<Resource<Dashboard>>(path) });
}

export function useMonthlyReport(month: string) {
  const path = `${useBase()}/reports/monthly`;
  return useQuery({
    queryKey: [path, month],
    queryFn: () => api<Resource<MonthlyReport>>(`${path}?month=${month}`),
    placeholderData: keepPreviousData,
  });
}

export type ExpenseFilters = { status?: ExpenseStatus | "pending"; month?: string; project_id?: number; page?: number };

export function useExpenses(filters: ExpenseFilters) {
  const path = `${useBase()}/expenses`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, String(value));

  return useQuery({
    queryKey: [path, filters],
    queryFn: () => api<Paginated<Expense>>(`${path}?${params}`),
    placeholderData: keepPreviousData,
  });
}

export function useExpense(id: number | null) {
  const path = `${useBase()}/expenses/${id}`;
  return useQuery({ queryKey: [path], queryFn: () => api<Resource<Expense>>(path), enabled: id !== null });
}

export type ExpenseInput = {
  project_id: number;
  description: string;
  payee: string | null;
  amount: number;
  spent_on: string;
  allocations: { budget_line_id: number; percent: number }[];
  attachment: File | null;
};

function toFormData(input: ExpenseInput, method?: "PATCH") {
  const form = new FormData();
  if (method) form.set("_method", method);
  form.set("project_id", String(input.project_id));
  form.set("description", input.description);
  if (input.payee) form.set("payee", input.payee);
  form.set("amount", String(input.amount));
  form.set("spent_on", input.spent_on);
  input.allocations.forEach((a, i) => {
    form.set(`allocations[${i}][budget_line_id]`, String(a.budget_line_id));
    form.set(`allocations[${i}][percent]`, String(a.percent));
  });
  if (input.attachment) form.set("attachment", input.attachment);
  return form;
}

export function useSaveExpense(expenseId?: number) {
  const path = `${useBase()}/expenses`;
  const invalidate = useInvalidateOrganization();

  return useMutation({
    // PHP parses multipart bodies on POST only, so edits are POST + _method=PATCH.
    mutationFn: (input: ExpenseInput) =>
      api<Resource<Expense>>(expenseId ? `${path}/${expenseId}` : path, {
        method: "POST",
        body: toFormData(input, expenseId ? "PATCH" : undefined),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteExpense() {
  const path = `${useBase()}/expenses`;
  const invalidate = useInvalidateOrganization();
  return useMutation({
    mutationFn: (id: number) => api<void>(`${path}/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useExpenseDecision(id: number) {
  const path = `${useBase()}/expenses/${id}`;
  const invalidate = useInvalidateOrganization();

  return useMutation({
    mutationFn: ({ decision, reason }: { decision: "review" | "approve" | "reject"; reason?: string }) =>
      api<Resource<Expense>>(`${path}/${decision}`, { method: "POST", json: reason ? { reason } : {} }),
    onSuccess: invalidate,
  });
}

export function attachmentUrl(base: string, id: number) {
  return `/api${base}/expenses/${id}/attachment`;
}

export function useAttachmentUrl(id: number) {
  return attachmentUrl(useBase(), id);
}

export function useGrants(filters: { project_id?: number; donor_id?: number } = {}) {
  const path = `${useBase()}/grants`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, String(value));
  return useQuery({ queryKey: [path, filters], queryFn: () => api<Paginated<Grant>>(`${path}?${params}`) });
}

export type GrantInput = {
  donor_id: number;
  project_id: number;
  reference: string | null;
  amount: number;
  signed_on: string | null;
  tranches: { id?: number; amount: number; expected_on: string; received_on: string | null }[];
};

export function useSaveGrant(grantId?: number) {
  const path = `${useBase()}/grants`;
  const invalidate = useInvalidateOrganization();
  return useMutation({
    mutationFn: (input: GrantInput) =>
      api<Resource<Grant>>(grantId ? `${path}/${grantId}` : path, { method: grantId ? "PUT" : "POST", json: input }),
    onSuccess: invalidate,
  });
}

export function useBudgetLines(projectId: number | null) {
  const path = `${useBase()}/projects/${projectId}/budget-lines`;
  return useQuery({
    queryKey: [path],
    queryFn: () => api<Paginated<BudgetLine>>(path),
    enabled: projectId !== null,
  });
}

export function useSaveBudgetLine(projectId: number, lineId?: number) {
  const base = useBase();
  const invalidate = useInvalidateOrganization();
  return useMutation({
    mutationFn: (input: { name: string; amount: number }) =>
      api<Resource<BudgetLine>>(lineId ? `${base}/budget-lines/${lineId}` : `${base}/projects/${projectId}/budget-lines`, {
        method: lineId ? "PUT" : "POST",
        json: input,
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteBudgetLine() {
  const base = useBase();
  const invalidate = useInvalidateOrganization();
  return useMutation({
    mutationFn: (lineId: number) => api<void>(`${base}/budget-lines/${lineId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
