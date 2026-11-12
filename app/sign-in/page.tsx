import { redirect } from "next/navigation";
import { connection } from "next/server";

import { getSessionFromCookies } from "@/backend/modules/auth/services/session.service";

import { Logo } from "../components/logo";
import { ThreeLogo } from "../components/three-logo";
import { SignInForm } from "./sign-in-form";

export const instant = false;

export default async function SignInPage() {
  await connection();

  const session = await getSessionFromCookies();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="signin-centered">
      <div className="signin-centered-bg" aria-hidden="true">
        <ThreeLogo />
      </div>

      <div className="signin-centered-content">
        <Logo size="lg" withTagline />

        <section className="signin-card signin-card-centered">
          <p className="eyebrow">Acceso a la red VERLA</p>
          <h2>Bienvenido de nuevo</h2>
          <p className="signin-sub">
            Ingresa con tu cuenta de aliado o empleado para continuar.
          </p>

          <SignInForm />

          <p className="signin-meta">
            Las cuentas de organización pertenecen al backoffice de VERLA y no
            pueden ingresar a este portal.
          </p>
        </section>

        <div className="signin-centered-foot">
          <span>Internet hogar</span>
          <span>Fibra óptica</span>
          <span>Red de aliados</span>
        </div>
      </div>
    </main>
  );
}
