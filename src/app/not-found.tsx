import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <div className="text-6xl">🫥</div>
        <h1 className="mt-4 text-2xl font-bold">404</h1>
        <Link href="/today" className="mt-4 inline-block font-semibold text-accent">← Violi</Link>
      </div>
    </div>
  );
}
