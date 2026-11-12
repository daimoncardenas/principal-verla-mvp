import { redirect } from "next/navigation";
import { connection } from "next/server";

import { getSessionFromCookies } from "@/backend/modules/auth/services/session.service";

import { SignInForm } from "./sign-in-form";

export const instant = false;

export default async function SignInPage() {
  await connection();

  const session = await getSessionFromCookies();

  if (session) {
    redirect("/");
  }

  return (
    <main>
      <h1>VERLA</h1>
      <p>Ingresa con tu cuenta de aliado o empleado.</p>
      <SignInForm />
    </main>
  );
}
