import { useTranslations } from "next-intl";
import { instrumentLabel, instrumentMeta, skillLevelLabel, sortInstruments } from "@/lib/instruments";
import { Icon } from "@/components/ui/icon";
import type { ProfileInstrument } from "@/types";

interface Props {
  instruments?: ProfileInstrument[] | null;
  className?: string;
}

/** Ce que joue un musicien : le principal en plein, les autres au trait. */
export function InstrumentChips({ instruments, className = "" }: Props) {
  const t = useTranslations("instruments.chips");
  const te = useTranslations("enums");
  if (!instruments?.length) return null;

  return (
    <ul aria-label={t("label")} className={`flex flex-wrap gap-1.5 ${className}`}>
      {sortInstruments(instruments).map((entry) => (
        <li
          key={entry.instrument}
          title={`${instrumentLabel(entry, te)} · ${skillLevelLabel(entry.level, te)}${entry.is_primary ? ` · ${t("primary")}` : ""}`}
          className={`inline-flex min-h-[26px] items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${
            entry.is_primary ? "bg-foreground text-background" : "border border-border text-muted-foreground"
          }`}
        >
          <Icon name={instrumentMeta(entry.instrument).icon} className="h-3.5 w-3.5" />
          {instrumentLabel(entry, te)}
          {entry.is_primary && (
            <span className="font-normal opacity-70">· {skillLevelLabel(entry.level, te)}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
