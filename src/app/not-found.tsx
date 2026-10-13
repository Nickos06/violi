import Link from "next/link";
import { ViolinMark } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="flex flex-col items-center">
        <ViolinMark size={72} />
        <h1 className="font-display mt-6 text-[56px] font-semibold leading-none">404</h1>
        <Link href="/today" className="press mt-6 font-bold text-accent">← Violi</Link>
      </div>
    </div>
  );
}
