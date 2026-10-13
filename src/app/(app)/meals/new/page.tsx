import { getT, requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { MealBuilder } from "../meal-builder";

export const metadata = { title: "New meal" };

export default async function NewMealPage() {
  await requireUser();
  const { t } = await getT();
  return (
    <div className="animate-rise">
      <PageHeader back="/meals" title={t.saved.new} subtitle={t.saved.subtitle} />
      <MealBuilder />
    </div>
  );
}
