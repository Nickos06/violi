import { getT, requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { Tools } from "./tools-client";

export const metadata = { title: "Tools" };

export default async function ToolsPage() {
  await requireUser();
  const { t } = await getT();
  return (
    <div className="animate-rise">
      <PageHeader back="/gym" title={t.gym.tools} />
      <Tools />
    </div>
  );
}
