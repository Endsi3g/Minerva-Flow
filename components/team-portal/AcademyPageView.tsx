import { Card } from "@/components/minerva/PageCard";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { AlertBanner } from "@/components/ui/AlertBanner";
import type { AcademyPage, AcademyTag } from "@/lib/data/team-academy";

const TAG_TONE: Record<AcademyTag, BadgeTone> = {
  vérifié: "green",
  hypothèse: "blue",
  cible: "purple",
  "à confirmer": "amber",
};

export function AcademyPageView({ page }: { page: AcademyPage }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-mv-ink">{page.title}</h1>
        <p className="mt-1 text-[13.5px] text-mv-ink-soft">{page.description}</p>
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[11.5px] text-mv-ink-faint">
          Étiquettes :
          {(Object.keys(TAG_TONE) as AcademyTag[]).map((tag) => (
            <Badge key={tag} tone={TAG_TONE[tag]} variant="subtle" size="sm">
              {tag}
            </Badge>
          ))}
        </p>
      </div>

      {page.sections.map((section) => (
        <Card key={section.id}>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-[18px] font-medium text-mv-ink">{section.title}</h2>
            {section.teamOnly && (
              <Badge tone="ink" variant="subtle" size="sm">
                équipe seulement
              </Badge>
            )}
          </div>
          {section.intro && <p className="mt-2 text-[13.5px] leading-relaxed text-mv-ink-soft">{section.intro}</p>}
          {section.items && (
            <ul className="mt-3 space-y-2.5">
              {section.items.map((item) => (
                <li key={item.text} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-mv-ink">
                  {item.tag ? (
                    <Badge tone={TAG_TONE[item.tag]} variant="subtle" size="sm" className="mt-0.5 shrink-0">
                      {item.tag}
                    </Badge>
                  ) : (
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-mv-green" aria-hidden="true" />
                  )}
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          )}
          {section.note && (
            <div className="mt-4">
              <AlertBanner tone={section.note.tone === "warn" ? "warning" : "info"}>{section.note.text}</AlertBanner>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
