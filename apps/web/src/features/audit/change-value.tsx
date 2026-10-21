import { useFormatter, useLocale, useTranslations } from "next-intl";
import { monthName, regionName } from "@/features/onboarding/options";
import type { AuditChange, AuditSubjectType, Locale } from "@/lib/types";

const LANGUAGES: Record<string, string> = { ar: "العربية", fr: "Français", en: "English" };

/** One changed field, rendered as a reader would say it: "Status: Draft → Active". */
export function ChangeRow({ change, subject }: { change: AuditChange; subject: AuditSubjectType }) {
  const t = useTranslations("app.audit");
  const label = t.has(`fields.${change.field}` as Parameters<typeof t>[0])
    ? t(`fields.${change.field}` as Parameters<typeof t>[0])
    : change.field;

  if (change.field === "permissions") {
    return <PermissionsChange label={label} before={change.old} after={change.new} />;
  }

  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-label">
      <span className="text-steel">{label}</span>
      <span className="text-stone line-through decoration-stone/60">
        <ChangeValue field={change.field} value={change.old} subject={subject} />
      </span>
      <span aria-hidden className="text-stone rtl:rotate-180">→</span>
      <span className="font-medium text-ink">
        <ChangeValue field={change.field} value={change.new} subject={subject} />
      </span>
    </li>
  );
}

function ChangeValue({ field, value, subject }: { field: string; value: unknown; subject: AuditSubjectType }) {
  const t = useTranslations();
  const format = useFormatter();
  const locale = useLocale() as Locale;

  if (value === null || value === undefined || value === "") return <>{t("app.audit.empty_value")}</>;

  const text = String(value);
  switch (field) {
    case "status":
      if (subject === "project") return <>{t(`projects.statuses.${text}` as Parameters<typeof t>[0])}</>;
      if (subject === "membership") return <>{t(`app.status.${text}` as Parameters<typeof t>[0])}</>;
      break;
    case "type":
      if (subject === "donor") return <>{t(`donors.types.${text}` as Parameters<typeof t>[0])}</>;
      break;
    case "progress":
      return <>{format.number(Number(value) / 100, { style: "percent" })}</>;
    case "starts_on":
    case "ends_on":
      return <>{format.dateTime(new Date(text), { dateStyle: "medium" })}</>;
    case "country":
      return <>{regionName(locale, text)}</>;
    case "locale":
      return <>{LANGUAGES[text] ?? text}</>;
    case "fiscal_year_start_month":
      return <>{monthName(locale, Number(value))}</>;
    case "name":
      if (typeof value === "object") return <>{(value as Record<string, string>)[locale]}</>;
      break;
  }

  return (
    <span dir="auto" className="inline-block max-w-[28rem] truncate align-bottom">
      {text}
    </span>
  );
}

function PermissionsChange({ label, before, after }: { label: string; before: unknown; after: unknown }) {
  const t = useTranslations("app.audit");
  const tp = useTranslations("permissions");
  const previous = new Set(Array.isArray(before) ? (before as string[]) : []);
  const next = new Set(Array.isArray(after) ? (after as string[]) : []);
  const granted = [...next].filter((p) => !previous.has(p));
  const revoked = [...previous].filter((p) => !next.has(p));
  const name = (permission: string) => {
    const key = permission.replace(".", "_") as Parameters<typeof tp>[0];
    return tp.has(key) ? tp(key) : permission;
  };

  return (
    <li className="flex flex-col gap-1.5 text-label">
      <span className="text-steel">{label}</span>
      <span className="flex flex-wrap gap-1.5">
        {granted.map((p) => (
          <span key={p} className="rounded-xs bg-success-soft px-2 py-0.5 text-caption text-success" title={t("granted")}>
            + {name(p)}
          </span>
        ))}
        {revoked.map((p) => (
          <span key={p} className="rounded-xs bg-danger-soft px-2 py-0.5 text-caption text-danger line-through" title={t("revoked")}>
            − {name(p)}
          </span>
        ))}
      </span>
    </li>
  );
}
