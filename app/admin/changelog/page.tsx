import { getChangelogEntries } from "@/lib/data/changelog";
import { ChangelogAdminView } from "./ChangelogAdminView";

export default async function AdminChangelogPage() {
  const entries = await getChangelogEntries();

  return (
    <div>
      <h1 className="mb-1 font-display text-[22px] font-medium text-mv-ink">Journal des mises à jour</h1>
      <p className="mb-6 text-[13px] text-mv-ink-soft">
        Publier une entrée notifie tous les utilisateurs actifs et l&apos;invite à consulter le changelog.
      </p>
      <ChangelogAdminView initialEntries={entries} />
    </div>
  );
}
