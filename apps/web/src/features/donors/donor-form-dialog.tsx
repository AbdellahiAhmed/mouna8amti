import { useLocale, useTranslations } from "next-intl";
import type { SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input, Select } from "@/components/ui/input";
import { useApiErrorMessage } from "@/features/auth/use-api-error-message";
import { COUNTRIES, regionName } from "@/features/onboarding/options";
import { ApiError } from "@/lib/api";
import type { Donor, DonorType } from "@/lib/types";
import { useSaveDonor, type DonorInput } from "./queries";

export const DONOR_TYPES: DonorType[] = ["multilateral", "bilateral", "foundation", "government", "private", "other"];

export function DonorFormDialog({
  donor,
  open,
  onOpenChange,
}: {
  donor?: Donor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("donors");
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={donor?.name ?? t("new")}>
      <DonorForm key={donor?.id ?? "new"} donor={donor} onDone={() => onOpenChange(false)} />
    </Dialog>
  );
}

function DonorForm({ donor, onDone }: { donor?: Donor; onDone: () => void }) {
  const t = useTranslations("donors");
  const tp = useTranslations("projects");
  const locale = useLocale();
  const save = useSaveDonor(donor?.id);
  const formError = useApiErrorMessage()(save.error);
  const fieldError = (field: keyof DonorInput) =>
    save.error instanceof ApiError ? save.error.firstFieldError(field) : undefined;
  // Donors are often foreign: offer every market we target plus the donor's current country.
  const countries = [...new Set([...(donor?.country ? [donor.country] : []), ...COUNTRIES])];

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim() || null;

    save.mutate(
      {
        name: String(form.get("name")).trim(),
        type: form.get("type") as DonorType,
        country: text("country"),
        contact_name: text("contact_name"),
        contact_email: text("contact_email"),
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormAlert message={formError} />

      <Field label={t("name")} error={fieldError("name")}>
        <Input name="name" defaultValue={donor?.name} required autoFocus />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("type")} error={fieldError("type")}>
          <Select name="type" defaultValue={donor?.type ?? "multilateral"}>
            {DONOR_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`types.${type}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("country")} error={fieldError("country")}>
          <Select name="country" defaultValue={donor?.country ?? ""}>
            <option value="">—</option>
            {countries.map((code) => (
              <option key={code} value={code}>
                {regionName(locale, code)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("contactName")} error={fieldError("contact_name")}>
          <Input name="contact_name" defaultValue={donor?.contact_name ?? ""} />
        </Field>
        <Field label={t("contactEmail")} error={fieldError("contact_email")}>
          <Input name="contact_email" type="email" defaultValue={donor?.contact_email ?? ""} dir="ltr" />
        </Field>
      </div>

      <div className="mt-2 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onDone}>
          {tp("cancel")}
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? tp("saving") : tp("save")}
        </Button>
      </div>
    </form>
  );
}
