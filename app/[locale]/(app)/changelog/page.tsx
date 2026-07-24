import { getChangelogEntries } from "@/lib/data/changelog";
import { ChangelogView } from "@/components/minerva/ChangelogView";

export default async function ChangelogPage() {
  const entries = await getChangelogEntries();

  return <ChangelogView initialEntries={entries} />;
}
