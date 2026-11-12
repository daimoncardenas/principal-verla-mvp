"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import { useSession } from "../../components/session-context";
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
  Select,
  Spinner,
  StatCard,
  Textarea,
} from "../../components/ui";
import { apiFetch, errorMessage } from "../../lib/api";
import {
  currentYearMonthInTimeZone,
  formatDate,
  formatMonth,
} from "../../lib/format";
import { useApiData } from "../../lib/hooks";
import { hasPermission } from "../../lib/permissions";
import type {
  ActivityType,
  EmployeeGoal,
  Goal,
  MetricGroup,
  Offer,
} from "../../lib/types";

export default function GoalsPage() {
  const session = useSession();
  const canList = hasPermission(session.permissions, "GOAL_LIST");
  const canCreate = hasPermission(session.permissions, "GOAL_CREATE");
  const canListTypes = hasPermission(
    session.permissions,
    "ACTIVITY_TYPE_LIST",
  );

  const goals = useApiData<{ goals: Goal[] }>(
    canList ? "/api/goals" : null,
  );
  const activityTypes = useApiData<{ activity_types: ActivityType[] }>(
    canListTypes ? "/api/activity-types" : null,
  );
  const employeeGoals = useApiData<{ employee_goals: EmployeeGoal[] }>(
    canList ? "/api/employee-goals" : null,
  );
  const canListOffers = hasPermission(session.permissions, "OFFER_LIST");
  const offers = useApiData<{ offers: Offer[] }>(
    canListOffers ? "/api/offers" : null,
  );
  const period = currentYearMonthInTimeZone(session.organization.timezone);
  const canReadMetrics = hasPermission(session.permissions, "GOAL_METRICS");
  const metricsUrl = canReadMetrics
    ? session.account_type === "PARTNER"
      ? `/api/goal-metrics/partner?year=${period.year}&month=${period.month}`
      : session.employee_id
        ? `/api/goal-metrics/seller/${session.employee_id}?year=${period.year}&month=${period.month}`
        : null
    : null;
  const metrics = useApiData<{ groups: MetricGroup[] }>(metricsUrl);

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [activityTypeId, setActivityTypeId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignmentCountByGoal = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of employeeGoals.data?.employee_goals ?? []) {
      if (item.status !== "ACTIVE") continue;
      counts.set(item.goal_id, (counts.get(item.goal_id) ?? 0) + 1);
    }
    return counts;
  }, [employeeGoals.data]);
  const metricByGoal = useMemo(() => {
    const map = new Map<string, MetricGroup>();
    for (const group of metrics.data?.groups ?? []) {
      if (!map.has(group.goal_id)) map.set(group.goal_id, group);
    }
    return map;
  }, [metrics.data]);

  const selectedActivityType = activityTypes.data?.activity_types.find(
    (type) => type.id === activityTypeId,
  );
  const requiresOffer = selectedActivityType?.requires_offer === true;

  const typeNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const type of activityTypes.data?.activity_types ?? []) {
      map.set(type.id, type.code);
    }
    return map;
  }, [activityTypes.data]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (requiresOffer && !offerId) {
      setError("Selecciona la oferta para una meta de tipo SALE.");
      return;
    }

    setSaving(true);

    try {
      await apiFetch("/api/goals", {
        method: "POST",
        body: JSON.stringify({
          code: code.trim(),
          name: name.trim(),
          activity_type_id: activityTypeId,
          offer_id: requiresOffer ? offerId || null : null,
          description: description.trim() || null,
        }),
      });
      setOpen(false);
      setCode("");
      setName("");
      setDescription("");
      setOfferId("");
      goals.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  if (!canList) {
    return (
      <>
        <PageHeader title="Metas" description="Metas del aliado." />
        <Alert tone="error">
          Tu cuenta no tiene permiso GOAL_LIST para consultar metas.
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Metas"
        description="Catálogo de metas del aliado y su regla de conteo."
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setActivityTypeId(
                  activityTypes.data?.activity_types[0]?.id ?? "",
                );
                setOfferId("");
                setError(null);
                setOpen(true);
              }}
            >
              + Crear meta
            </Button>
          ) : undefined
        }
      />

      <div className="stat-grid">
        <StatCard
          label="Metas"
          value={String(goals.data?.goals.length ?? 0)}
        />
        <StatCard
          label="Activas"
          value={String(
            (goals.data?.goals ?? []).filter((goal) => goal.is_active).length,
          )}
        />
        <StatCard
          label="Inactivas"
          value={String(
            (goals.data?.goals ?? []).filter((goal) => !goal.is_active).length,
          )}
        />
        <StatCard
          label="Asignaciones activas"
          value={String(
            (employeeGoals.data?.employee_goals ?? []).filter(
              (item) => item.status === "ACTIVE",
            ).length,
          )}
          detail={formatMonth(period.year, period.month)}
        />
        {canReadMetrics ? (
          <StatCard
            label="Metas con avance"
            value={String(metricByGoal.size)}
            detail="Periodo actual"
          />
        ) : null}
      </div>

      <Card>
        <CardHeader
          title="Metas del aliado"
          description="Cada meta conserva su tipo de actividad y regla de agregación."
        />
        <div className="card-body">
          {goals.error ? <Alert tone="error">{goals.error}</Alert> : null}
          {goals.loading ? <Spinner label="Cargando metas…" /> : null}
          {!goals.loading && (goals.data?.goals.length ?? 0) === 0 ? (
            <EmptyState
              title="Sin metas"
              description="Crea la primera meta para poder asignarla al equipo."
              action={
                canCreate ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setActivityTypeId(
                        activityTypes.data?.activity_types[0]?.id ?? "",
                      );
                      setOfferId("");
                      setError(null);
                      setOpen(true);
                    }}
                  >
                    Crear meta
                  </Button>
                ) : undefined
              }
            />
          ) : null}
          {(goals.data?.goals.length ?? 0) > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Meta</th>
                    <th>Tipo de actividad</th>
                    <th>Agregación</th>
                    <th>Asignaciones</th>
                    <th>Avance</th>
                    <th>Estado</th>
                    <th>Creada</th>
                    <th>Código</th>
                  </tr>
                </thead>
                <tbody>
                  {goals.data?.goals.map((goal) => (
                    <tr key={goal.id}>
                      <td>
                        <div className="cell-stack">
                          <Link
                            href={`/goals/${goal.id}`}
                            className="table-link"
                          >
                            {goal.name}
                          </Link>
                          <span>{goal.description ?? "Sin descripción"}</span>
                        </div>
                      </td>
                      <td>
                        {typeNames.get(goal.activity_type_id) ?? "—"}
                      </td>
                      <td>{goal.aggregation}</td>
                      <td>{assignmentCountByGoal.get(goal.id) ?? 0}</td>
                      <td>
                        {metricByGoal.get(goal.id)
                          ? `${metricByGoal.get(goal.id)?.actual_value} / ${metricByGoal.get(goal.id)?.target_value}`
                          : "—"}
                      </td>
                      <td>
                        <Badge tone={goal.is_active ? "success" : "warning"}>
                          {goal.is_active ? "Activa" : "Inactiva"}
                        </Badge>
                      </td>
                      <td>{formatDate(goal.created_at)}</td>
                      <td className="mono">{goal.code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </Card>

      <Modal
        open={open}
        title="Crear meta"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" form="goal-form" disabled={saving}>
              {saving ? "Creando…" : "Crear meta"}
            </Button>
          </>
        }
      >
        <form id="goal-form" className="stack" onSubmit={submit}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Field label="Código" htmlFor="goal_code">
            <Input
              id="goal_code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="SALES_MONTH"
              required
            />
          </Field>
          <Field label="Nombre" htmlFor="goal_name">
            <Input
              id="goal_name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ventas del mes"
              required
            />
          </Field>
          <Field label="Tipo de actividad" htmlFor="goal_activity_type">
            <Select
              id="goal_activity_type"
              value={activityTypeId}
              onChange={(event) => {
                setActivityTypeId(event.target.value);
                setOfferId("");
              }}
              required
            >
              <option value="">Selecciona un tipo</option>
              {(activityTypes.data?.activity_types ?? []).map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.code})
                </option>
              ))}
            </Select>
          </Field>
          {requiresOffer ? (
            <Field
              label="Oferta"
              htmlFor="goal_offer"
              hint="Solo ofertas publicadas y vigentes."
            >
              <Select
                id="goal_offer"
                value={offerId}
                onChange={(event) => setOfferId(event.target.value)}
                required
              >
                <option value="">Selecciona una oferta</option>
                {(offers.data?.offers ?? []).map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {offer.title}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="Descripción" htmlFor="goal_description">
            <Textarea
              id="goal_description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
        </form>
      </Modal>
    </>
  );
}
