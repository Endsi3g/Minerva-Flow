import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getWorkspaceHubDataAction } from "./actions";
import { WorkspaceView } from "./WorkspaceView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("workspace") };
}

export default async function WorkspacePage() {
  const data = await getWorkspaceHubDataAction();
  return <WorkspaceView data={data} />;
}
