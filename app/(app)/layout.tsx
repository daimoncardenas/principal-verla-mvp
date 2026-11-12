import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { getSessionFromCookies } from "@/backend/modules/auth/services/session.service";
import { serializeSessionWithPermissions } from "@/backend/modules/auth/services/session.service";
import { hasPermission } from "@/app/lib/permissions";
import type { SessionUser } from "@/app/lib/types";

import { AppShell, type NavItem } from "../components/app-shell";
import { SessionProvider } from "../components/session-context";

export const instant = false;

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  await connection();

  const context = await getSessionFromCookies();

  if (!context) {
    redirect("/sign-in");
  }

  const session = (await serializeSessionWithPermissions(
    context,
  )) as SessionUser;
  const permissions = session.permissions;
  const nav: NavItem[] = [];

  if (hasPermission(permissions, "DASHBOARD_READ")) {
    nav.push({ href: "/dashboard", label: "Dashboard", icon: "◈" });
  }

  if (
    hasPermission(permissions, "EMPLOYEE_LIST") ||
    hasPermission(permissions, "EMPLOYEE_READ")
  ) {
    nav.push({ href: "/employees", label: "Empleados", icon: "◎" });
  }

  if (
    session.account_type === "EMPLOYEE" &&
    (hasPermission(permissions, "ACTIVITY_LIST") ||
      hasPermission(permissions, "ACTIVITY_READ"))
  ) {
    nav.push({ href: "/activities", label: "Actividades", icon: "◉" });
  }

  if (
    hasPermission(permissions, "GOAL_LIST") ||
    hasPermission(permissions, "GOAL_READ")
  ) {
    nav.push({ href: "/goals", label: "Metas", icon: "◆" });
  }

  if (
    hasPermission(permissions, "PROFILE_READ") ||
    hasPermission(permissions, "PROFILE_UPDATE")
  ) {
    nav.push({ href: "/settings", label: "Configuración", icon: "⚙" });
  }

  return (
    <SessionProvider user={session}>
      <AppShell session={session} nav={nav}>
        {children}
      </AppShell>
    </SessionProvider>
  );
}
