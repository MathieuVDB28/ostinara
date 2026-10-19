import { PublicShell } from "@/components/layout/public-shell";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
