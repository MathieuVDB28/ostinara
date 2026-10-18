import { instrumentLabel, instrumentMeta, skillLevelLabel, sortInstruments } from "@/lib/instruments";
import { Icon } from "@/components/ui/icon";
import type { ProfileInstrument } from "@/types";

interface Props {
  instruments?: ProfileInstrument[] | null;
  className?: string;
}

/** Ce que joue un musicien : le principal en plein, les autres au trait. */
export function InstrumentChips({ instruments, className = "" }: Props) {
  if (!instruments?.length) return null;

  return (
    <ul aria-label="Instruments" className={`flex flex-wrap gap-1.5 ${className}`}>
      {sortInstruments(instruments).map((entry) => (
        <li
          key={entry.instrument}
          title={`${instrumentLabel(entry)} · ${skillLevelLabel(entry.level)}${entry.is_primary ? " · principal" : ""}`}
          className={`inline-flex min-h-[26px] items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${
            entry.is_primary ? "bg-foreground text-background" : "border border-border text-muted-foreground"
          }`}
        >
          <Icon name={instrumentMeta(entry.instrument).icon} className="h-3.5 w-3.5" />
          {instrumentLabel(entry)}
          {entry.is_primary && (
            <span className="font-normal opacity-70">· {skillLevelLabel(entry.level)}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
