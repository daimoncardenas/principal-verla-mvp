"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { EmployeeForm } from "../../../components/employee-form";
import {
  employeeTypeName,
  useEmployeeLookups,
} from "../../../components/employee-lookups";
import { useSession } from "../../../components/session-context";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Tabs,
  Textarea,
} from "../../../components/ui";
import { apiFetch, errorMessage } from "../../../lib/api";
import {
  currentYearMonthInTimeZone,
  formatDate,
  formatDateTime,
  formatMonth,
  statusLabel,
} from "../../../lib/format";
import { useApiData } from "../../../lib/hooks";
import { hasPermission } from "../../../lib/permissions";
import type {
  Activity,
  Employee,
  EmployeeAssignment,
  EmployeeGoal,
  Goal,
} from "../../../lib/types";

function statusTone(status: string) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "BLOCKED") return "danger" as const;
  return "warning" as const;
}

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const session = useSession();
  const lookups = useEmployeeLookups(session.permissions);
  const employeeData = useApiData<{
    employee: Employee;
    current_assignment: EmployeeAssignment | null;
  }>(`/api/employees/${params.id}`);
  const assignments = useApiData<{ assignments: EmployeeAssignment[] }>(
    `/api/employees/${params.id}/assignments`,
  );
  const canListGoals = hasPermission(session.permissions, "GOAL_LIST");
  const canAssignGoal = hasPermission(session.permissions, "GOAL_ASSIGN");
  const goals = useApiData<{ goals: Goal[] }>(
    canListGoals ? "/api/goals" : null,
  );
  const employeeGoals = useApiData<{ employee_goals: EmployeeGoal[] }>(
    canListGoals ? "/api/employee-goals" : null,
  );
  const canListActivities = hasPermission(
    session.permissions,
    "ACTIVITY_LIST",
  );
  const activities = useApiData<{ activities: Activity[] }>(
    canListActivities ? "/api/activities" : null,
  );

  const [activeSection, setActiveSection] = useState("employee-profile");
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusValue, setStatusValue] = useState("ACTIVE");
  const [statusReason, setStatusReason] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusConflict, setStatusConflict] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [supervisorOpen, setSupervisorOpen] = useState(false);
  const [supervisorValue, setSupervisorValue] = useState("");
  const [supervisorSaving, setSupervisorSaving] = useState(false);
  const [supervisorError, setSupervisorError] = useState<string | null>(null);
  const [supervisorConflict, setSupervisorConflict] = useState(false);

  const period = currentYearMonthInTimeZone(session.organization.timezone);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalId, setGoalId] = useState("");
  const [goalYear, setGoalYear] = useState(String(period.year));
  const [goalMonth, setGoalMonth] = useState(String(period.month));
  const [goalTarget, setGoalTarget] = useState("10");
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);

  const employee = employeeData.data?.employee;
  const currentAssignment = employeeData.data?.current_assignment;

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

  const employeeNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of lookups.employees) {
      map.set(item.id, `${item.first_name} ${item.last_name}`);
    }
    return map;
  }, [lookups.employees]);

  const employeeActivities = useMemo(
    () =>
      (activities.data?.activities ?? []).filter(
        (activity) => activity.employee_id === employee?.id,
      ),
    [activities.data, employee?.id],
  );

  const roleCode = employee
    ? typeNames.get(employee.employee_type_id) ??
      employeeTypeName(employee, lookups.employeeTypes, session.employee_id)
    : null;
  const isSeller = roleCode === "SELLER";
  const canUpdate = lookups.canUpdateEmployee;
  const canDelete = lookups.canDeleteEmployee;
  const canChangeSupervisor = lookups.canAssignSupervisor && isSeller;

  const supervisorCandidates = useMemo(() => {
    const coordinatorTypeIds = new Set(
      lookups.employeeTypes
        .filter((type) => type.code === "COORDINATOR")
        .map((type) => type.id),
    );

    return lookups.employees.filter(
      (item) =>
        item.status === "ACTIVE" &&
        coordinatorTypeIds.has(item.employee_type_id) &&
        item.id !== employee?.id,
    );
  }, [lookups.employeeTypes, lookups.employees, employee?.id]);

  function openStatus() {
    if (!employee) return;
    setStatusValue(employee.status);
    setStatusReason("");
    setStatusError(null);
    setStatusConflict(false);
    setStatusOpen(true);
  }

  async function submitStatus() {
    if (!employee) return;
    setStatusSaving(true);
    setStatusError(null);
    setStatusConflict(false);

    try {
      await apiFetch(`/api/employees/${employee.id}/status`, {
        method: "POST",
        body: JSON.stringify({
          expectedVersion: employee.version,
          status: statusValue,
          status_reason:
            statusValue === "ACTIVE" ? null : statusReason.trim(),
        }),
      });
      window.location.reload();
    } catch (cause) {
      const message = errorMessage(cause);
      setStatusError(message);
      if (message.toLowerCase().includes("version")) {
        setStatusConflict(true);
      }
    } finally {
      setStatusSaving(false);
    }
  }

  async function submitDelete() {
    if (!employee) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      await apiFetch(`/api/employees/${employee.id}`, {
        method: "DELETE",
        body: JSON.stringify({ expectedVersion: employee.version }),
      });
      router.push("/employees");
    } catch (cause) {
      setDeleteOpen(false);
      setDeleteError(errorMessage(cause));
    } finally {
      setDeleting(false);
    }
  }

  async function submitSupervisor() {
    if (!employee) return;
    setSupervisorSaving(true);
    setSupervisorError(null);
    setSupervisorConflict(false);

    try {
      await apiFetch(`/api/employees/${employee.id}/supervisor`, {
        method: "POST",
        body: JSON.stringify({
          expectedVersion: employee.version,
          supervisor_id: supervisorValue,
        }),
      });
      window.location.reload();
    } catch (cause) {
      const message = errorMessage(cause);
      setSupervisorError(message);
      if (message.toLowerCase().includes("version")) {
        setSupervisorConflict(true);
      }
    } finally {
      setSupervisorSaving(false);
    }
  }

  async function submitGoal() {
    if (!employee) return;
    setGoalSaving(true);
    setGoalError(null);

    try {
      await apiFetch("/api/employee-goals", {
        method: "POST",
        body: JSON.stringify({
          employee_id: employee.id,
          goal_id: goalId,
          year: Number(goalYear),
          month: Number(goalMonth),
          target_value: Number(goalTarget),
        }),
      });
      setGoalOpen(false);
      employeeGoals.reload();
    } catch (cause) {
      setGoalError(errorMessage(cause));
    } finally {
      setGoalSaving(false);
    }
  }

  if (employeeData.loading && !employee) {
    return <Spinner label="Cargando empleado…" />;
  }

  if (employeeData.error) {
    return (
      <>
        <PageHeader title="Empleado" />
        <Alert tone="error">{employeeData.error}</Alert>
        <Link href="/employees" className="btn btn-ghost">
          Volver a empleados
        </Link>
      </>
    );
  }

  if (!employee) {
    return (
      <>
        <PageHeader title="Empleado" />
        <EmptyState
          title="Empleado no encontrado"
          description="El empleado no existe o está fuera de tu alcance."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`${employee.first_name} ${employee.last_name}`}
        description={`${employee.job_title} · ${employee.email}`}
        actions={
          <Link href="/employees" className="btn btn-ghost">
            Volver
          </Link>
        }
      />

      <div className="flex wrap">
        <Badge tone={statusTone(employee.status)}>
          {statusLabel(employee.status)}
        </Badge>
        {roleCode ? <Badge tone="info">{roleCode}</Badge> : null}
        <span className="text-xs muted">Versión {employee.version}</span>
        {currentAssignment ? (
          <span className="text-xs muted">
            Asignación vigente desde {formatDate(currentAssignment.valid_from)}
          </span>
        ) : null}
      </div>

      <Tabs
        tabs={[
          { id: "employee-profile", label: "Perfil" },
          { id: "employee-activities", label: "Actividades" },
          { id: "employee-goals", label: "Metas" },
        ]}
        active={activeSection}
        onChange={setActiveSection}
      />

      {activeSection === "employee-profile" ? (
        <>
      <div className="grid-2" id="employee-profile">
        <Card>
          <CardHeader
            title="Datos del empleado"
            description="Información de contacto y alcance actual."
          />
          <div className="card-body">
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  <tr>
                    <th>Documento</th>
                    <td>
                      {employee.document_type} {employee.document_number}
                    </td>
                  </tr>
                  <tr>
                    <th>Correo</th>
                    <td>{employee.email}</td>
                  </tr>
                  <tr>
                    <th>Teléfono</th>
                    <td>{employee.phone}</td>
                  </tr>
                  <tr>
                    <th>Ingreso</th>
                    <td>{formatDate(employee.hired_at)}</td>
                  </tr>
                  <tr>
                    <th>Rol</th>
                    <td>{roleCode ? <Badge tone="info">{roleCode}</Badge> : "—"}</td>
                  </tr>
                  <tr>
                    <th>Supervisor</th>
                    <td>
                      {employee.supervisor_id
                        ? employeeNames.get(employee.supervisor_id) ?? "—"
                        : "—"}
                    </td>
                  </tr>
                  <tr>
                    <th>Ciudades</th>
                    <td>
                      {employee.city_ids
                        .map((id) => cityNames.get(id))
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </td>
                  </tr>
                  <tr>
                    <th>Actualizado</th>
                    <td>{formatDateTime(employee.updated_at)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Acciones"
            description="Las operaciones respetan versión y alcance del servidor."
          />
          <div className="card-body stack">
            {canUpdate ? (
              <Button variant="secondary" onClick={openStatus}>
                Cambiar estado
              </Button>
            ) : (
              <p className="text-sm muted">
                No tienes permiso para cambiar el estado de este empleado.
              </p>
            )}

            {canChangeSupervisor ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSupervisorValue(employee.supervisor_id ?? "");
                  setSupervisorError(null);
                  setSupervisorConflict(false);
                  setSupervisorOpen(true);
                }}
              >
                Cambiar supervisor
              </Button>
            ) : null}

            {canDelete ? (
              <Button
                variant="danger"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteOpen(true);
                }}
              >
                Dar de baja
              </Button>
            ) : null}
          </div>
        </Card>
      </div>

      {canUpdate ? (
        <Card>
          <CardHeader
            title="Editar empleado"
            description="Los cambios de rol y supervisor se validan en una sola operación."
          />
          <div className="card-body">
            <EmployeeForm
              mode="edit"
              employee={employee}
              employeeTypes={lookups.employeeTypes}
              cities={lookups.cities}
              employees={lookups.employees}
              permissions={lookups.permissions}
              session={session}
              canAssignPermissions={false}
              canChangeRole={session.account_type === "PARTNER"}
            />
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Historial de asignaciones"
          description="Rol y supervisor por intervalo; una asignación vigente no tiene fecha de fin."
        />
        <div className="card-body">
          {assignments.loading ? <Spinner label="Cargando historial…" /> : null}
          {assignments.error ? (
            <Alert tone="error">{assignments.error}</Alert>
          ) : null}
          {!assignments.loading &&
          (assignments.data?.assignments.length ?? 0) === 0 ? (
            <EmptyState
              title="Sin asignaciones"
              description="No hay asignaciones registradas para este empleado."
            />
          ) : null}
          {(assignments.data?.assignments.length ?? 0) > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Rol</th>
                    <th>Supervisor</th>
                    <th>Desde</th>
                    <th>Hasta</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.data?.assignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td>
                        {typeNames.get(assignment.employee_type_id) ?? "—"}
                      </td>
                      <td>
                        {assignment.supervisor_id
                          ? employeeNames.get(assignment.supervisor_id) ?? "—"
                          : "—"}
                      </td>
                      <td>{formatDateTime(assignment.valid_from)}</td>
                      <td>
                        {assignment.valid_to
                          ? formatDateTime(assignment.valid_to)
                          : "Vigente"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </Card>

        </>
      ) : null}

      {activeSection === "employee-activities" ? (
      <Card id="employee-activities">
        <CardHeader
          title="Actividades"
          description="Registro del empleado y acceso al detalle de cada actividad."
        />
        <div className="card-body">
          {activities.loading ? <Spinner label="Cargando actividades…" /> : null}
          {activities.error ? <Alert tone="error">{activities.error}</Alert> : null}
          {!activities.loading && employeeActivities.length === 0 ? (
            <EmptyState
              title="Sin actividades"
              description="Este empleado aún no tiene actividades registradas."
            />
          ) : null}
          {employeeActivities.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Actividad</th>
                    <th>Realizada</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {employeeActivities.slice(0, 10).map((activity) => (
                    <tr key={activity.id}>
                      <td>{activity.title}</td>
                      <td>{formatDateTime(activity.performed_at)}</td>
                      <td>
                        <Badge
                          tone={
                            activity.status === "COMPLETED" ? "success" : "danger"
                          }
                        >
                          {statusLabel(activity.status)}
                        </Badge>
                      </td>
                      <td>
                        <Link
                          href={`/activities/${activity.id}`}
                          className="btn btn-ghost btn-sm"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </Card>

      ) : null}

      {activeSection === "employee-goals" ? (
      <Card id="employee-goals">
        <CardHeader
          title="Metas"
          description="Asignaciones mensuales del empleado y su objetivo."
          actions={
            canAssignGoal ? (
              <Button
                size="sm"
                onClick={() => {
                  setGoalId(goals.data?.goals[0]?.id ?? "");
                  const now = currentYearMonthInTimeZone(
                    session.organization.timezone,
                  );
                  setGoalYear(String(now.year));
                  setGoalMonth(String(now.month));
                  setGoalTarget("10");
                  setGoalError(null);
                  setGoalOpen(true);
                }}
              >
                Asignar meta
              </Button>
            ) : undefined
          }
        />
        <div className="card-body">
          {employeeGoals.loading ? (
            <Spinner label="Cargando metas asignadas…" />
          ) : null}
          {employeeGoals.error ? (
            <Alert tone="error">{employeeGoals.error}</Alert>
          ) : null}
          {!employeeGoals.loading &&
          (employeeGoals.data?.employee_goals.filter(
            (goal) => goal.employee_id === employee.id,
          ).length ?? 0) === 0 ? (
            <EmptyState
              title="Sin metas asignadas"
              description="Asigna una meta mensual para que este empleado entre en las métricas."
            />
          ) : null}
          {(employeeGoals.data?.employee_goals.filter(
            (goal) => goal.employee_id === employee.id,
          ).length ?? 0) > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Meta</th>
                    <th>Periodo</th>
                    <th>Objetivo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeGoals.data?.employee_goals
                    .filter((goal) => goal.employee_id === employee.id)
                    .map((goal) => (
                      <tr key={goal.id}>
                        <td>
                          {goals.data?.goals.find(
                            (item) => item.id === goal.goal_id,
                          )?.name ?? goal.rules_snapshot.goal_name}
                        </td>
                        <td>{formatMonth(goal.year, goal.month)}</td>
                        <td>{goal.target_value}</td>
                        <td>
                          <Badge
                            tone={
                              goal.status === "ACTIVE" ? "success" : "warning"
                            }
                          >
                            {goal.status === "ACTIVE" ? "Activa" : "Cancelada"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </Card>

      ) : null}

      <Modal
        open={goalOpen}
        title="Asignar meta"
        onClose={() => setGoalOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setGoalOpen(false)}
              disabled={goalSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={submitGoal}
              disabled={goalSaving || !goalId}
            >
              {goalSaving ? "Asignando…" : "Asignar meta"}
            </Button>
          </>
        }
      >
        <div className="stack">
          {goalError ? <Alert tone="error">{goalError}</Alert> : null}
          <Field label="Meta" htmlFor="employee_goal_id">
            <Select
              id="employee_goal_id"
              value={goalId}
              onChange={(event) => setGoalId(event.target.value)}
              required
            >
              <option value="">Selecciona una meta</option>
              {(goals.data?.goals ?? []).map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.name} ({goal.code})
                </option>
              ))}
            </Select>
          </Field>
          <div className="form-grid">
            <Field label="Año" htmlFor="employee_goal_year">
              <Input
                id="employee_goal_year"
                type="number"
                value={goalYear}
                onChange={(event) => setGoalYear(event.target.value)}
                min={2000}
                max={2100}
                required
              />
            </Field>
            <Field label="Mes" htmlFor="employee_goal_month">
              <Select
                id="employee_goal_month"
                value={goalMonth}
                onChange={(event) => setGoalMonth(event.target.value)}
                required
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map(
                  (month) => (
                    <option key={month} value={month}>
                      {formatMonth(Number(goalYear), month)}
                    </option>
                  ),
                )}
              </Select>
            </Field>
          </div>
          <Field label="Objetivo" htmlFor="employee_goal_target">
            <Input
              id="employee_goal_target"
              type="number"
              value={goalTarget}
              onChange={(event) => setGoalTarget(event.target.value)}
              min={1}
              required
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={statusOpen}
        title="Cambiar estado"
        onClose={() => setStatusOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setStatusOpen(false)}
              disabled={statusSaving}
            >
              Cancelar
            </Button>
            <Button onClick={submitStatus} disabled={statusSaving}>
              {statusSaving ? "Guardando…" : "Guardar estado"}
            </Button>
          </>
        }
      >
        <div className="stack">
          {statusError ? (
            <Alert
              tone="error"
              action={
                statusConflict ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    Recargar
                  </Button>
                ) : undefined
              }
            >
              {statusError}
            </Alert>
          ) : null}
          <Field label="Estado" htmlFor="status">
            <Select
              id="status"
              value={statusValue}
              onChange={(event) => setStatusValue(event.target.value)}
            >
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
              <option value="BLOCKED">Bloqueado</option>
            </Select>
          </Field>
          {statusValue !== "ACTIVE" ? (
            <Field label="Motivo" htmlFor="status_reason">
              <Textarea
                id="status_reason"
                value={statusReason}
                onChange={(event) => setStatusReason(event.target.value)}
                placeholder="Explica el motivo del cambio de estado"
                required
              />
            </Field>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={supervisorOpen}
        title="Cambiar supervisor"
        onClose={() => setSupervisorOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setSupervisorOpen(false)}
              disabled={supervisorSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={submitSupervisor}
              disabled={supervisorSaving || !supervisorValue}
            >
              {supervisorSaving ? "Guardando…" : "Cambiar supervisor"}
            </Button>
          </>
        }
      >
        <div className="stack">
          {supervisorError ? (
            <Alert
              tone="error"
              action={
                supervisorConflict ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    Recargar
                  </Button>
                ) : undefined
              }
            >
              {supervisorError}
            </Alert>
          ) : null}
          <Field label="Coordinador" htmlFor="supervisor">
            <Select
              id="supervisor"
              value={supervisorValue}
              onChange={(event) => setSupervisorValue(event.target.value)}
              required
            >
              <option value="">Selecciona un coordinador</option>
              {supervisorCandidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.first_name} {candidate.last_name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="Dar de baja al empleado"
        description="El empleado quedará fuera de la operación. La baja conserva el historial y requiere la versión vigente."
        confirmLabel="Dar de baja"
        busy={deleting}
        danger
        onConfirm={submitDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      {deleteError ? <Alert tone="error">{deleteError}</Alert> : null}
    </>
  );
}
