"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { useSession } from "@/app/components/session-context";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  ProgressBar,
  Select,
  Spinner,
  Tabs,
  Textarea,
} from "@/app/components/ui";
import { apiFetch, errorMessage } from "@/app/lib/api";
import { formatMonth } from "@/app/lib/format";
import { useApiData } from "@/app/lib/hooks";
import { hasPermission } from "@/app/lib/permissions";
import type {
  ActivityType,
  DashboardResponse,
  Employee,
  EmployeeGoal,
  Goal,
  MetricGroup,
} from "@/app/lib/types";

export default function GoalDetailPage() {
  const params = useParams<{ id: string }>();
  const session = useSession();
  const goalData = useApiData<{ goal: Goal }>(`/api/goals/${params.id}`);
  const employeeGoals = useApiData<{ employee_goals: EmployeeGoal[] }>(
    hasPermission(session.permissions, "GOAL_LIST")
      ? "/api/employee-goals"
      : null,
  );
  const employees = useApiData<{ employees: Employee[] }>(
    hasPermission(session.permissions, "EMPLOYEE_LIST")
      ? "/api/employees"
      : null,
  );
  const activityTypes = useApiData<{ activity_types: ActivityType[] }>(
    hasPermission(session.permissions, "ACTIVITY_TYPE_LIST")
      ? "/api/activity-types"
      : null,
  );
  const dashboard = useApiData<DashboardResponse>(
    hasPermission(session.permissions, "DASHBOARD_READ")
      ? "/api/dashboard"
      : null,
  );

  const goal = goalData.data?.goal;
  const [tab, setTab] = useState("general");
  const [editOpen, setEditOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [activityTypeId, setActivityTypeId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const canUpdate = hasPermission(session.permissions, "GOAL_UPDATE");
  const canListGoals = hasPermission(session.permissions, "GOAL_LIST");

  const typeNames = useMemo(() => {
    const map = new Map<string, ActivityType>();
    for (const type of activityTypes.data?.activity_types ?? []) {
      map.set(type.id, type);
    }
    return map;
  }, [activityTypes.data]);

  const employeeNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const employee of employees.data?.employees ?? []) {
      map.set(employee.id, `${employee.first_name} ${employee.last_name}`);
    }
    return map;
  }, [employees.data]);

  const assignedGoals = useMemo(
    () =>
      (employeeGoals.data?.employee_goals ?? []).filter(
        (item) => item.goal_id === goal?.id,
      ),
    [employeeGoals.data, goal?.id],
  );

  const metricGroups = useMemo(() => {
    const metrics = dashboard.data?.metrics;
    if (!metrics) return [] as MetricGroup[];
    const groups = [
      ...(metrics.groups ?? []),
      ...(metrics.own?.groups ?? []),
      ...(metrics.team?.groups ?? []),
    ];
    return groups.filter((group) => group.goal_id === goal?.id);
  }, [dashboard.data, goal?.id]);

  function openEdit() {
    if (!goal) return;
    setCode(goal.code);
    setName(goal.name);
    setDescription(goal.description ?? "");
    setActivityTypeId(goal.activity_type_id);
    setIsActive(goal.is_active);
    setError(null);
    setConflict(false);
    setEditOpen(true);
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!goal) return;
    setSaving(true);
    setError(null);
    setConflict(false);

    try {
      await apiFetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          expectedVersion: goal.version,
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || null,
          activity_type_id: activityTypeId,
          is_active: isActive,
        }),
      });
      setEditOpen(false);
      goalData.reload();
      dashboard.reload();
    } catch (cause) {
      const message = errorMessage(cause);
      setError(message);
      setConflict(message.toLowerCase().includes("version"));
    } finally {
      setSaving(false);
    }
  }

  if (goalData.loading && !goal) {
    return <Spinner label="Cargando meta…" />;
  }

  if (goalData.error || !goal) {
    return (
      <>
        <PageHeader title="Meta" />
        <Alert tone="error">
          {goalData.error ?? "La meta no existe o está fuera del alcance."}
        </Alert>
        <Link href="/goals" className="btn btn-ghost">
          Volver a metas
        </Link>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={goal.name}
        description="Detalle de la meta, empleados asignados y métricas del periodo."
        actions={
          <div className="row-actions">
            {canUpdate ? (
              <Button variant="secondary" onClick={openEdit}>
                Editar meta
              </Button>
            ) : null}
            <Link href="/goals" className="btn btn-ghost">
              Volver
            </Link>
          </div>
        }
      />

      <div className="flex wrap">
        <Badge tone={goal.is_active ? "success" : "warning"}>
          {goal.is_active ? "Activa" : "Inactiva"}
        </Badge>
        <span className="text-xs muted">Versión {goal.version}</span>
        <span className="text-xs muted mono">{goal.code}</span>
      </div>

      <Tabs
        tabs={[
          { id: "general", label: "Datos generales" },
          { id: "employees", label: "Empleados" },
          { id: "metrics", label: "Métricas" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "general" ? (
        <Card>
          <CardHeader
            title="Datos generales"
            description="La regla de conteo queda fijada al crear la meta."
          />
          <div className="card-body">
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  <tr>
                    <th>Código</th>
                    <td className="mono">{goal.code}</td>
                  </tr>
                  <tr>
                    <th>Nombre</th>
                    <td>{goal.name}</td>
                  </tr>
                  <tr>
                    <th>Descripción</th>
                    <td>{goal.description ?? "Sin descripción"}</td>
                  </tr>
                  <tr>
                    <th>Tipo de actividad</th>
                    <td>
                      {typeNames.get(goal.activity_type_id)?.name ??
                        typeNames.get(goal.activity_type_id)?.code ??
                        "—"}
                    </td>
                  </tr>
                  <tr>
                    <th>Agregación</th>
                    <td>{goal.aggregation}</td>
                  </tr>
                  <tr>
                    <th>Estado requerido</th>
                    <td>{goal.required_activity_status}</td>
                  </tr>
                  <tr>
                    <th>Oferta específica</th>
                    <td>{goal.offer_id ? "Sí" : "No"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      ) : null}

      {tab === "employees" ? (
        <Card>
          <CardHeader
            title="Empleados"
            description="Asignaciones mensuales de esta meta."
            actions={
              canListGoals ? (
                <Link href="/employees" className="btn btn-ghost btn-sm">
                  Gestionar en empleados
                </Link>
              ) : undefined
            }
          />
          <div className="card-body">
            {employeeGoals.loading ? (
              <Spinner label="Cargando asignaciones…" />
            ) : null}
            {employeeGoals.error ? (
              <Alert tone="error">{employeeGoals.error}</Alert>
            ) : null}
            {!employeeGoals.loading && assignedGoals.length === 0 ? (
              <EmptyState
                title="Sin empleados asignados"
                description="Asigna esta meta desde el detalle de cada empleado."
              />
            ) : null}
            {assignedGoals.length > 0 ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Periodo</th>
                      <th>Objetivo</th>
                      <th>Estado</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {assignedGoals.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link
                            href={`/employees/${item.employee_id}`}
                            className="table-link"
                          >
                            {employeeNames.get(item.employee_id) ?? item.employee_id}
                          </Link>
                        </td>
                        <td>{formatMonth(item.year, item.month)}</td>
                        <td>{item.target_value}</td>
                        <td>
                          <Badge
                            tone={item.status === "ACTIVE" ? "success" : "warning"}
                          >
                            {item.status === "ACTIVE" ? "Activa" : "Cancelada"}
                          </Badge>
                        </td>
                        <td>
                          <Link
                            href={`/employees/${item.employee_id}`}
                            className="btn btn-ghost btn-sm"
                          >
                            Ver empleado
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

      {tab === "metrics" ? (
        <Card>
          <CardHeader
            title="Métricas"
            description="Avance consolidado del periodo actual."
          />
          <div className="card-body stack">
            {!hasPermission(session.permissions, "GOAL_METRICS") ? (
              <Alert tone="info">
                Tu cuenta no incluye GOAL_METRICS para consultar el avance.
              </Alert>
            ) : dashboard.loading ? (
              <Spinner label="Cargando métricas…" />
            ) : dashboard.error ? (
              <Alert tone="error">{dashboard.error}</Alert>
            ) : metricGroups.length === 0 ? (
              <EmptyState
                title="Sin métricas del periodo"
                description="No hay avance consolidado para esta meta en el periodo actual."
              />
            ) : (
              metricGroups.map((group) => (
                <div key={`${group.goal_id}-${group.rules.activity_type_id}`} className="stack-sm">
                  <div className="flex-between">
                    <strong>{group.goal_name}</strong>
                    <span className="text-xs muted">
                      {group.actual_value} / {group.target_value}
                    </span>
                  </div>
                  <ProgressBar
                    value={group.progress_percentage}
                    tone={
                      group.progress_percentage >= 100 ? "success" : "accent"
                    }
                  />
                  <span className="text-xs muted">
                    {group.rules.required_activity_status} · {group.rules.aggregation}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      ) : null}

      <Modal
        open={editOpen}
        title="Editar meta"
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" form="goal-edit-form" disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </>
        }
      >
        <form id="goal-edit-form" className="stack" onSubmit={submitEdit}>
          {error ? (
            <Alert
              tone="error"
              action={
                conflict ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => goalData.reload()}
                  >
                    Recargar
                  </Button>
                ) : undefined
              }
            >
              {error}
            </Alert>
          ) : null}
          <Field label="Código" htmlFor="goal_edit_code">
            <Input
              id="goal_edit_code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
          </Field>
          <Field label="Nombre" htmlFor="goal_edit_name">
            <Input
              id="goal_edit_name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </Field>
          <Field label="Descripción" htmlFor="goal_edit_description">
            <Textarea
              id="goal_edit_description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <Field label="Tipo de actividad" htmlFor="goal_edit_activity_type">
            <Select
              id="goal_edit_activity_type"
              value={activityTypeId}
              onChange={(event) => setActivityTypeId(event.target.value)}
              required
            >
              {(activityTypes.data?.activity_types ?? []).map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.code})
                </option>
              ))}
            </Select>
          </Field>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <span>Meta activa</span>
          </label>
        </form>
      </Modal>
    </>
  );
}
