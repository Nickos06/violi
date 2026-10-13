import { getT, requireUser } from "@/lib/auth";
import { exerciseLibrary } from "@/lib/gym-library";
import { PageHeader } from "@/components/ui";
import { RoutineEditor } from "../routine-editor";

export const metadata = { title: "New routine" };

export default async function NewRoutinePage() {
  const user = await requireUser();
  const { t } = await getT();
  return (
    <div className="animate-rise">
      <PageHeader back="/gym" title={t.gym.newRoutine} />
      <RoutineEditor library={await exerciseLibrary(user.id)} />
    </div>
  );
}
