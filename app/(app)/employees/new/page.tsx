"use client";

import Link from "next/link";

import { EmployeeForm } from "../../../components/employee-form";
import { useEmployeeLookups } from "../../../components/employee-lookups";
import { useSession } from "../../../components/session-context";
import {
  Alert,
  Card,
  CardHeader,
  PageHeader,
  Spinner,
} from "../../../components/ui";
import { hasPermission } from "../../../lib/permissions";

export default function NewEmployeePage() {
  const session = useSession();
  const lookups = useEmployeeLookups(session.permissions);
  const canCreate = hasPermission(session.permissions, "EMPLOYEE_CREATE");

  if (!canCreate) {
    return (
      <>
        <PageHeader
          title="Nuevo empleado"
          description="Alta de empleados del aliado."
        />
        <Alert tone="error">
          Tu cuenta no tiene permiso EMPLOYEE_CREATE para crear empleados.
        </Alert>
        <Link href="/employees" className="btn btn-ghost">
          Volver a empleados
        </Link>
      </>
    );
  }

  if (lookups.loading) {
    return <Spinner label="Cargando catálogos…" />;
  }

  if (lookups.error) {
    return (
      <>
        <PageHeader title="Nuevo empleado" />
        <Alert tone="error">{lookups.error}</Alert>
      </>
    );
  }

  if (lookups.employeeTypes.length === 0) {
    return (
      <>
        <PageHeader title="Nuevo empleado" />
        <Alert tone="warning">
          No hay roles disponibles para crear empleados con tu alcance actual.
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Nuevo empleado"
        description="El servidor asigna la contraseña inicial y registra la auditoría del alta."
      />

      <Card>
        <CardHeader
          title="Datos del empleado"
          description="El rol y el supervisor se validan contra tu alcance y permisos."
        />
        <div className="card-body">
          <EmployeeForm
            mode="create"
            employeeTypes={lookups.employeeTypes}
            cities={lookups.cities}
            employees={lookups.employees}
            permissions={lookups.permissions}
            session={session}
            canAssignPermissions={lookups.canAssignPermission}
            canChangeRole={session.account_type === "PARTNER"}
          />
        </div>
      </Card>
    </>
  );
}
