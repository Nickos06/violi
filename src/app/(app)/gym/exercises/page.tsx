import { getT, requireUser } from "@/lib/auth";
import { exerciseLibrary } from "@/lib/gym-library";
import { PageHeader } from "@/components/ui";
import { ExerciseBrowser } from "./exercise-browser";

export const metadata = { title: "Exercises" };

export default async function ExercisesPage() {
  const user = await requireUser();
  const { t } = await getT();
  return (
    <div className="animate-rise">
      <PageHeader back="/gym" title={t.gym.exercises} />
      <ExerciseBrowser library={await exerciseLibrary(user.id)} />
    </div>
  );
}
