"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { EmployeeForm } from "../../components/employee-form";
import {
  employeeTypeName,
  useEmployeeLookups,
} from "../../components/employee-lookups";
import { useSession } from "../../components/session-context";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatCard,
} from "../../components/ui";
import { useApiData } from "../../lib/hooks";
import { statusLabel } from "../../lib/format";
import { hasPermission } from "../../lib/permissions";
import type { Employee } from "../../lib/types";

function statusTone(status: string) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "BLOCKED") return "danger" as const;
  return "warning" as const;
}

export default function EmployeesPage() {
  const session = useSession();
  const lookups = useEmployeeLookups(session.permissions);
  const canList = hasPermission(session.permissions, "EMPLOYEE_LIST");
  const canCreate = hasPermission(session.permissions, "EMPLOYEE_CREATE");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [typeId, setTypeId] = useState("");
  const [cityId, setCityId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (typeId) params.set("employee_type_id", typeId);
  if (cityId) params.set("city_id", cityId);
  const query = params.toString();
  const employees = useApiData<{ employees: Employee[] }>(
    canList ? `/api/employees${query ? `?${query}` : ""}` : null,
  );

  const typeNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const type of lookups.employeeTypes) {
      map.set(type.id, type.code);
    }
    return map;
  }, [lookups.employeeTypes]);

  const cityNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const city of lookups.cities) {
      map.set(city.id, city.name);
    }
    return map;
  }, [lookups.cities]);

  const supervisorNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const employee of lookups.employees) {
      map.set(employee.id, `${employee.first_name} ${employee.last_name}`);
    }
    return map;
  }, [lookups.employees]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = employees.data?.employees ?? [];

    if (!term) {
      return list;
    }

    return list.filter((employee) =>
      `${employee.first_name} ${employee.last_name} ${employee.email} ${employee.document_number}`
        .toLowerCase()
        .includes(term),
    );
  }, [employees.data, search]);

  const activeCount = filtered.filter((employee) => employee.status === "ACTIVE").length;
  const blockedCount = filtered.filter((employee) => employee.status === "BLOCKED").length;

  if (!canList) {
    return (
      <>
        <PageHeader
          title="Empleados"
          description="Gestión del equipo del aliado."
        />
        <Alert tone="error">
          Tu cuenta no tiene permisos para listar empleados.
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Empleados"
        description="Equipo del aliado, roles, estado y asignaciones vigentes."
        actions={
          canCreate ? (
            <Button onClick={() => setCreateOpen(true)}>+ Nuevo empleado</Button>
          ) : undefined
        }
      />

      <div className="stat-grid">
        <StatCard label="Empleados" value={String(filtered.length)} />
        <StatCard label="Activos" value={String(activeCount)} />
        <StatCard label="Bloqueados" value={String(blockedCount)} />
        <StatCard
          label="Ciudades"
          value={String(lookups.cities.length)}
          detail="Catálogo disponible"
        />
      </div>

      <Card>
        <div className="card-body stack">
          <div className="form-grid">
            <Input
              placeholder="Buscar por nombre, correo o documento…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Buscar empleados"
            />
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filtrar por estado"
            >
              <option value="">Todos los estados</option>
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
              <option value="BLOCKED">Bloqueado</option>
            </Select>
            <Select
              value={typeId}
              onChange={(event) => setTypeId(event.target.value)}
              aria-label="Filtrar por rol"
            >
              <option value="">Todos los roles</option>
              {lookups.employeeTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
            <Select
              value={cityId}
              onChange={(event) => setCityId(event.target.value)}
              aria-label="Filtrar por ciudad"
            >
              <option value="">Todas las ciudades</option>
              {lookups.cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </Select>
          </div>

          {employees.error ? <Alert tone="error">{employees.error}</Alert> : null}
          {employees.loading ? <Spinner label="Cargando empleados…" /> : null}

          {!employees.loading && filtered.length === 0 ? (
            <EmptyState
              title="Sin empleados"
              description="No hay empleados que coincidan con los filtros actuales."
              action={
                canCreate ? (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    Crear el primero
                  </Button>
                ) : undefined
              }
            />
          ) : null}

          {filtered.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Ciudad</th>
                    <th>Supervisor</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <div className="cell-stack">
                          <Link
                            href={`/employees/${employee.id}`}
                            className="table-link"
                          >
                            {employee.first_name} {employee.last_name}
                          </Link>
                          <span>{employee.email}</span>
                        </div>
                      </td>
                      <td>
                        {typeNames.get(employee.employee_type_id) ??
                          employeeTypeName(
                            employee,
                            lookups.employeeTypes,
                            session.employee_id,
                          )}
                      </td>
                      <td>
                        <Badge tone={statusTone(employee.status)}>
                          {statusLabel(employee.status)}
                        </Badge>
                      </td>
                      <td>
                        {employee.city_ids
                          .map((id) => cityNames.get(id))
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>
                      <td>
                        {employee.supervisor_id
                          ? supervisorNames.get(employee.supervisor_id) ?? "—"
                          : "—"}
                      </td>
                      <td>
                        <div className="row-actions">
                          <Link
                            href={`/employees/${employee.id}`}
                            className="btn btn-ghost btn-sm"
                          >
                            Ver
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </Card>

      <Modal
        open={createOpen}
        title="Nuevo empleado"
        onClose={() => setCreateOpen(false)}
      >
        <EmployeeForm
          mode="create"
          employeeTypes={lookups.employeeTypes}
          cities={lookups.cities}
          employees={lookups.employees}
          permissions={lookups.permissions}
          session={session}
          canAssignPermissions={false}
          canChangeRole={session.account_type === "PARTNER"}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>
    </>
  );
}
