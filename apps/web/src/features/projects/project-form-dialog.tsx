import { useTranslations } from "next-intl";
import { useState, type SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input, Select } from "@/components/ui/input";
import { useApiErrorMessage } from "@/features/auth/use-api-error-message";
import { useMembers } from "@/features/organization/queries";
import { ApiError } from "@/lib/api";
import type { Project, ProjectStatus } from "@/lib/types";
import { useSaveProject, type ProjectInput } from "./queries";

export const PROJECT_STATUSES: ProjectStatus[] = ["draft", "active", "on_hold", "closed"];

export function ProjectFormDialog({
  project,
  open,
  onOpenChange,
}: {
  project?: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("projects");
  // Keyed on the project so reopening for another row starts from fresh state.
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={project ? t("edit") : t("new")}>
      <ProjectForm key={project?.id ?? "new"} project={project} onDone={() => onOpenChange(false)} />
    </Dialog>
  );
}

function ProjectForm({ project, onDone }: { project?: Project; onDone: () => void }) {
  const t = useTranslations("projects");
  const save = useSaveProject(project?.id);
  const members = useMembers();
  const formError = useApiErrorMessage()(save.error);
  const fieldError = (field: keyof ProjectInput) =>
    save.error instanceof ApiError ? save.error.firstFieldError(field) : undefined;

  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "draft");

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const manager = String(form.get("manager_membership_id") ?? "");

    save.mutate(
      {
        code: String(form.get("code")).trim(),
        name: String(form.get("name")).trim(),
        description: String(form.get("description") ?? "").trim() || null,
        manager_membership_id: manager ? Number(manager) : null,
        starts_on: String(form.get("starts_on")),
        ends_on: String(form.get("ends_on")),
        status,
        progress: Number(form.get("progress")),
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormAlert message={formError} />

      <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
        <Field label={t("code")} error={fieldError("code")}>
          <Input name="code" defaultValue={project?.code} required maxLength={32} dir="ltr" autoFocus />
        </Field>
        <Field label={t("name")} error={fieldError("name")}>
          <Input name="name" defaultValue={project?.name} required />
        </Field>
      </div>

      <Field label={t("manager")} error={fieldError("manager_membership_id")}>
        <Select name="manager_membership_id" defaultValue={project?.manager?.membership_id ?? ""}>
          <option value="">{t("noManager")}</option>
          {members.data?.data.map((member) => (
            <option key={member.id} value={member.id}>
              {member.user?.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("startsOn")} error={fieldError("starts_on")}>
          <Input name="starts_on" type="date" defaultValue={project?.starts_on} required />
        </Field>
        <Field label={t("endsOn")} error={fieldError("ends_on")}>
          <Input name="ends_on" type="date" defaultValue={project?.ends_on} required />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("status")} error={fieldError("status")}>
          <Select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
            {PROJECT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`statuses.${value}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("progress")} error={fieldError("progress")}>
          <Input name="progress" type="number" min={0} max={100} step={1} defaultValue={project?.progress ?? 0} required />
        </Field>
      </div>

      <Field label={t("description")} error={fieldError("description")}>
        <textarea
          name="description"
          defaultValue={project?.description ?? ""}
          rows={3}
          className="w-full rounded-sm border border-hairline-strong bg-canvas px-3.5 py-2.5 text-body text-ink focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-soft)] focus:outline-none"
        />
      </Field>

      <div className="mt-2 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onDone}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
