import { PublicShell } from "@/components/layout/public-shell";

export default function PublicBandLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
