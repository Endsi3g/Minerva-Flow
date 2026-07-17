import { getWorkspaceHubDataAction } from "./actions";
import { WorkspaceView } from "./WorkspaceView";

export default async function WorkspacePage() {
  const data = await getWorkspaceHubDataAction();
  return <WorkspaceView data={data} />;
}
