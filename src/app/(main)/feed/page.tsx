import { redirect } from "next/navigation";

/** Ancienne route — conservee pour les liens et PWA deja installees. */
export default function Page() {
  redirect("/commu");
}
