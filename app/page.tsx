import { redirect } from "next/navigation";
import { connection } from "next/server";

import { getSessionFromCookies } from "@/backend/modules/auth/services/session.service";

import { LogoutButton } from "./logout-button";

export const instant = false;

export default async function Home() {
  await connection();

  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main>
      <h1>VERLA</h1>
      <p>
        Sesión iniciada como {session.display_name} ({session.email}).
      </p>
      <p>Organización: {session.organization_name}.</p>
      <LogoutButton />
    </main>
  );
}
