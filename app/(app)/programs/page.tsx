import { Suspense } from "react";
import { ProgramsView } from "./ProgramsView";

export default function ProgramsPage() {
  return (
    <Suspense>
      <ProgramsView />
    </Suspense>
  );
}
