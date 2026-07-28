import { listCutoutHistory } from "@/backend/cutout/history";
import { CutoutWorkspace } from "./cutout-workspace";

export default async function CutoutPage() {
  const history = await listCutoutHistory();
  return <CutoutWorkspace initialHistory={history} />;
}
