import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header simple */}
      <header className="flex h-16 items-center justify-center border-b border-border">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="" width={32} height={32} className="rounded-md" />
          <span className="font-display text-2xl font-extrabold uppercase leading-none tracking-[0.02em]">
            Ostinara
          </span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex flex-1 items-center justify-center p-6">
        {children}
      </main>
    </div>
  );
}
