"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import {
  formatDateTime,
  statusLabel,
  toDateTimeInputValue,
} from "@/app/lib/format";
import { useApiData } from "@/app/lib/hooks";
import { hasPermission } from "@/app/lib/permissions";
import type {
  Activity,
  ActivityType,
  City,
  Employee,
  EmployeeGoal,
  MetricGroup,
} from "@/app/lib/types";

function statusTone(status: string) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "CANCELLED") return "danger" as const;
  return "neutral" as const;
}

function yearMonthInTimeZone(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(value));
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

export default function ActivityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const session = useSession();
  const activityData = useApiData<{ activity: Activity }>(
    `/api/activities/${params.id}`,
  );
  const activityTypes = useApiData<{ activity_types: ActivityType[] }>(
    hasPermission(session.permissions, "ACTIVITY_TYPE_LIST")
      ? "/api/activity-types"
      : null,
  );
  const cities = useApiData<{ cities: City[] }>(
    hasPermission(session.permissions, "CITY_LIST") ? "/api/cities" : null,
  );
  const employees = useApiData<{ employees: Employee[] }>(
    hasPermission(session.permissions, "EMPLOYEE_LIST")
      ? "/api/employees"
      : null,
  );
  const employeeGoals = useApiData<{ employee_goals: EmployeeGoal[] }>(
    hasPermission(session.permissions, "GOAL_LIST")
      ? "/api/employee-goals"
      : null,
  );

  const activity = activityData.data?.activity;
  const period = activity
    ? yearMonthInTimeZone(
        activity.performed_at,
        session.organization.timezone,
      )
    : null;
  const canReadMetrics = hasPermission(session.permissions, "GOAL_METRICS");
  const metrics = useApiData<{ groups: MetricGroup[] }>(
    activity && canReadMetrics && period
      ? `/api/goal-metrics/seller/${activity.employee_id}?year=${period.year}&month=${period.month}`
      : null,
  );

  const [tab, setTab] = useState("details");
  const [editOpen, setEditOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cityId, setCityId] = useState("");
  const [performedAt, setPerformedAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const canUpdate = hasPermission(session.permissions, "ACTIVITY_UPDATE");
  const canCancel = hasPermission(session.permissions, "ACTIVITY_DELETE");

  const typeNames = useMemo(() => {
    const map = new Map<string, ActivityType>();
    for (const type of activityTypes.data?.activity_types ?? []) {
      map.set(type.id, type);
    }
    return map;
  }, [activityTypes.data]);

  const cityNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const city of cities.data?.cities ?? []) {
      map.set(city.id, city.name);
    }
    return map;
  }, [cities.data]);

  const employeeNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const employee of employees.data?.employees ?? []) {
      map.set(employee.id, `${employee.first_name} ${employee.last_name}`);
    }
    return map;
  }, [employees.data]);

  const relatedGoals = useMemo(
    () =>
      (employeeGoals.data?.employee_goals ?? []).filter(
        (goal) =>
          goal.employee_id === activity?.employee_id &&
          goal.rules_snapshot.activity_type_id === activity?.activity_type_id,
      ),
    [employeeGoals.data, activity],
  );

  function openEdit() {
    if (!activity) return;
    setTitle(activity.title);
    setDescription(activity.description ?? "");
    setCityId(activity.city_id);
    setPerformedAt(toDateTimeInputValue(activity.performed_at));
    setError(null);
    setConflict(false);
    setEditOpen(true);
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activity) return;
    setSaving(true);
    setError(null);
    setConflict(false);

    try {
      await apiFetch(`/api/activities/${activity.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          expectedVersion: activity.version,
          title: title.trim(),
          description: description.trim() || null,
          city_id: cityId,
          performed_at: new Date(performedAt).toISOString(),
        }),
      });
      setEditOpen(false);
      activityData.reload();
      metrics.reload();
    } catch (cause) {
      const message = errorMessage(cause);
      setError(message);
      setConflict(message.toLowerCase().includes("version"));
    } finally {
      setSaving(false);
    }
  }

  async function submitCancel() {
    if (!activity || !cancelReason.trim()) return;
    setCancelling(true);
    setError(null);

    try {
      await apiFetch(`/api/activities/${activity.id}`, {
        method: "DELETE",
        body: JSON.stringify({
          expectedVersion: activity.version,
          reason: cancelReason.trim(),
        }),
      });
      setCancelOpen(false);
      router.push("/activities");
    } catch (cause) {
      const message = errorMessage(cause);
      setError(message);
      setBreakdownConflict(message);
    } finally {
      setCancelling(false);
    }
  }

  function setBreakdownConflict(message: string) {
    setConflict(message.toLowerCase().includes("version"));
  }

  if (activityData.loading && !activity) {
    return <Spinner label="Cargando actividad…" />;
  }

  if (activityData.error || !activity) {
    return (
      <>
        <PageHeader title="Actividad" />
        <Alert tone="error">
          {activityData.error ?? "La actividad no existe o está fuera del alcance."}
        </Alert>
        <Link href="/activities" className="btn btn-ghost">
          Volver a actividades
        </Link>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={activity.title}
        description="Detalle de la actividad, metas relacionadas y métricas del empleado."
        actions={
          <Link href="/activities" className="btn btn-ghost">
            Volver
          </Link>
        }
      />

      <div className="flex wrap">
        <Badge tone={statusTone(activity.status)}>
          {statusLabel(activity.status)}
        </Badge>
        <span className="text-xs muted">Versión {activity.version}</span>
        <span className="text-xs muted">
          {formatDateTime(activity.performed_at)}
        </span>
      </div>

      {error ? (
        <Alert
          tone="error"
          action={
            conflict ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => activityData.reload()}
              >
                Recargar
              </Button>
            ) : undefined
          }
        >
          {error}
        </Alert>
      ) : null}

      <Tabs
        tabs={[
          { id: "details", label: "Detalles" },
          { id: "goals", label: "Metas" },
          { id: "metrics", label: "Métricas" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "details" ? (
        <div className="grid-2">
          <Card>
            <CardHeader
              title="Detalles"
              description="Datos registrados y snapshot de la oferta."
            />
            <div className="card-body">
              <div className="table-wrap">
                <table className="table">
                  <tbody>
                    <tr>
                      <th>Empleado</th>
                      <td>
                        {activity.employee_id === session.employee_id
                          ? `${session.display_name} (tú)`
                          : employeeNames.get(activity.employee_id) ?? "—"}
                      </td>
                    </tr>
                    <tr>
                      <th>Tipo</th>
                      <td>
                        {typeNames.get(activity.activity_type_id)?.name ??
                          typeNames.get(activity.activity_type_id)?.code ??
                          "—"}
                      </td>
                    </tr>
                    <tr>
                      <th>Ciudad</th>
                      <td>{cityNames.get(activity.city_id) ?? "—"}</td>
                    </tr>
                    <tr>
                      <th>Oferta</th>
                      <td>
                        {activity.offer_snapshot?.title ??
                          (activity.offer_id ? "Oferta registrada" : "—")}
                      </td>
                    </tr>
                    <tr>
                      <th>Realizada</th>
                      <td>{formatDateTime(activity.performed_at)}</td>
                    </tr>
                    <tr>
                      <th>Descripción</th>
                      <td>{activity.description ?? "Sin descripción"}</td>
                    </tr>
                    {activity.status === "CANCELLED" ? (
                      <tr>
                        <th>Motivo de cancelación</th>
                        <td>{activity.cancellation_reason ?? "—"}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Acciones"
              description="Las operaciones respetan versión y alcance."
            />
            <div className="card-body stack">
              {canUpdate && activity.status === "COMPLETED" ? (
                <Button variant="secondary" onClick={openEdit}>
                  Editar actividad
                </Button>
              ) : null}
              {canCancel && activity.status === "COMPLETED" ? (
                <Button
                  variant="danger"
                  onClick={() => {
                    setCancelReason("");
                    setError(null);
                    setCancelOpen(true);
                  }}
                >
                  Cancelar actividad
                </Button>
              ) : null}
              {!canUpdate && !canCancel ? (
                <p className="text-sm muted">
                  Tu cuenta no tiene acciones disponibles para esta actividad.
                </p>
              ) : null}
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "goals" ? (
        <Card>
          <CardHeader
            title="Metas relacionadas"
            description="Metas del empleado que cuentan este tipo de actividad."
          />
          <div className="card-body">
            {employeeGoals.loading ? <Spinner label="Cargando metas…" /> : null}
            {employeeGoals.error ? (
              <Alert tone="error">{employeeGoals.error}</Alert>
            ) : null}
            {!employeeGoals.loading && relatedGoals.length === 0 ? (
              <EmptyState
                title="Sin metas relacionadas"
                description="No hay metas del empleado para este tipo de actividad."
              />
            ) : null}
            {relatedGoals.length > 0 ? (
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
                    {relatedGoals.map((goal) => (
                      <tr key={goal.id}>
                        <td>{goal.rules_snapshot.goal_name}</td>
                        <td>
                          {goal.year}-{String(goal.month).padStart(2, "0")}
                        </td>
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

      {tab === "metrics" ? (
        <Card>
          <CardHeader
            title="Métricas del empleado"
            description="Avance del empleado para el periodo de la actividad."
          />
          <div className="card-body stack">
            {!canReadMetrics ? (
              <Alert tone="info">
                Tu cuenta no incluye GOAL_METRICS para consultar este avance.
              </Alert>
            ) : metrics.loading ? (
              <Spinner label="Cargando métricas…" />
            ) : metrics.error ? (
              <Alert tone="error">{metrics.error}</Alert>
            ) : (metrics.data?.groups.length ?? 0) === 0 ? (
              <EmptyState
                title="Sin métricas"
                description="No hay metas contabilizadas para el periodo de la actividad."
              />
            ) : (
              metrics.data?.groups.map((group) => (
                <div key={`${group.goal_id}-${group.rules.activity_type_id}`} className="stack-sm">
                  <div className="flex-between">
                    <strong>{group.goal_name}</strong>
                    <span className="text-xs muted">
                      {group.actual_value} / {group.target_value}
                    </span>
                  </div>
                  <ProgressBar
                    value={group.progress_percentage}
                    tone={group.progress_percentage >= 100 ? "success" : "accent"}
                  />
                </div>
              ))
            )}
          </div>
        </Card>
      ) : null}

      <Modal
        open={editOpen}
        title="Editar actividad"
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
            <Button type="submit" form="activity-edit-form" disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </>
        }
      >
        <form id="activity-edit-form" className="stack" onSubmit={submitEdit}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Field label="Título" htmlFor="activity_edit_title">
            <Input
              id="activity_edit_title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </Field>
          <Field label="Descripción" htmlFor="activity_edit_description">
            <Textarea
              id="activity_edit_description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <Field label="Ciudad" htmlFor="activity_edit_city">
            <Select
              id="activity_edit_city"
              value={cityId}
              onChange={(event) => setCityId(event.target.value)}
              required
            >
              {(cities.data?.cities ?? []).map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Realizada" htmlFor="activity_edit_performed">
            <Input
              id="activity_edit_performed"
              type="datetime-local"
              value={performedAt}
              onChange={(event) => setPerformedAt(event.target.value)}
              required
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={cancelOpen}
        title="Cancelar actividad"
        onClose={() => setCancelOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setCancelOpen(false)}
              disabled={cancelling}
            >
              Volver
            </Button>
            <Button
              variant="danger"
              onClick={submitCancel}
              disabled={cancelling || !cancelReason.trim()}
            >
              {cancelling ? "Cancelando…" : "Confirmar cancelación"}
            </Button>
          </>
        }
      >
        <div className="stack">
          {error ? <Alert tone="error">{error}</Alert> : null}
          <p className="text-sm muted">
            La actividad no se borra: queda cancelada y deja de contar en métricas.
          </p>
          <Field label="Motivo" htmlFor="activity_cancel_reason">
            <Textarea
              id="activity_cancel_reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              required
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
