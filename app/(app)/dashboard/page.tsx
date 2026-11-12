"use client";

import { useMemo } from "react";

import { ActivityTypeChart } from "../../components/activity-type-chart";
import { MetricsChart } from "../../components/metrics-chart";
import { useSession } from "../../components/session-context";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  ProgressBar,
  Spinner,
  StatCard,
} from "../../components/ui";
import {
  currentYearMonthInTimeZone,
  formatDate,
  formatMonth,
  isDateInYearMonth,
  roleLabel,
  statusLabel,
} from "../../lib/format";
import { useApiData } from "../../lib/hooks";
import { hasPermission } from "../../lib/permissions";
import type {
  Activity,
  ActivityType,
  DashboardResponse,
  Employee,
  EmployeeGoal,
  MetricGroup,
} from "../../lib/types";

function GroupList({ groups }: { groups: MetricGroup[] }) {
  if (groups.length === 0) {
    return (
      <EmptyState
        title="Sin metas en el periodo"
        description="Todavía no hay metas asignadas o contabilizadas para este mes."
      />
    );
  }

  return (
    <div className="stack">
      {groups.map((group) => (
        <div
          key={`${group.goal_id}-${group.rules.activity_type_id}`}
          className="stack-sm"
        >
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
          <span className="text-xs muted">
            {group.rules.required_activity_status} · {group.rules.aggregation}
            {group.rules.offer_id ? " · oferta específica" : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function MetricsCard({
  title,
  description,
  groups,
}: {
  title: string;
  description: string;
  groups: MetricGroup[];
}) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <div className="card-body stack">
        <MetricsChart groups={groups} />
        <GroupList groups={groups} />
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const session = useSession();
  const dashboard = useApiData<DashboardResponse>("/api/dashboard");
  const canListEmployees = hasPermission(session.permissions, "EMPLOYEE_LIST");
  const canListEmployeeGoals = hasPermission(
    session.permissions,
    "GOAL_LIST",
  );
  const canListActivities = hasPermission(
    session.permissions,
    "ACTIVITY_LIST",
  );
  const canListActivityTypes = hasPermission(
    session.permissions,
    "ACTIVITY_TYPE_LIST",
  );

  const employees = useApiData<{ employees: Employee[] }>(
    canListEmployees ? "/api/employees?status=ACTIVE" : null,
  );
  const employeeGoals = useApiData<{ employee_goals: EmployeeGoal[] }>(
    canListEmployeeGoals ? "/api/employee-goals" : null,
  );
  const activities = useApiData<{ activities: Activity[] }>(
    canListActivities ? "/api/activities" : null,
  );
  const activityTypes = useApiData<{ activity_types: ActivityType[] }>(
    canListActivityTypes ? "/api/activity-types" : null,
  );

  const data = dashboard.data;
  const period = data?.metrics
    ? { year: data.metrics.year, month: data.metrics.month }
    : currentYearMonthInTimeZone(session.organization.timezone);
  const timezone = data?.metrics?.timezone ?? session.organization.timezone;

  const activeEmployees = useMemo(
    () =>
      (employees.data?.employees ?? []).filter(
        (employee) => employee.status === "ACTIVE",
      ).length,
    [employees.data],
  );
  const activeGoals = useMemo(
    () =>
      (employeeGoals.data?.employee_goals ?? []).filter(
        (goal) =>
          goal.status === "ACTIVE" &&
          goal.year === period.year &&
          goal.month === period.month,
      ).length,
    [employeeGoals.data, period.year, period.month],
  );
  const completedActivities = useMemo(
    () =>
      (activities.data?.activities ?? []).filter(
        (activity) =>
          activity.status === "COMPLETED" &&
          isDateInYearMonth(
            activity.performed_at,
            period.year,
            period.month,
            timezone,
          ),
      ),
    [activities.data, period.year, period.month, timezone],
  );

  const activityTypeNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const type of activityTypes.data?.activity_types ?? []) {
      map.set(type.id, type.code);
    }
    return map;
  }, [activityTypes.data]);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const activity of completedActivities) {
      counts.set(
        activity.activity_type_id,
        (counts.get(activity.activity_type_id) ?? 0) + 1,
      );
    }

    return [...counts.entries()]
      .map(([id, value]) => ({
        label: activityTypeNames.get(id) ?? id.slice(-6),
        value,
      }))
      .sort((left, right) => right.value - left.value);
  }, [completedActivities, activityTypeNames]);

  const offersCount = data?.offers
    ? (data.offers.latest ? 1 : 0) + data.offers.other_current.length
    : null;
  const metricGroups = data?.metrics
    ? data.metrics.groups ??
      [
        ...(data.metrics.own?.groups ?? []),
        ...(data.metrics.team?.groups ?? []),
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Analíticas generales del periodo, metas y ofertas de VERLA."
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              dashboard.reload();
              employees.reload();
              employeeGoals.reload();
              activities.reload();
              activityTypes.reload();
            }}
            disabled={dashboard.loading}
          >
            {dashboard.loading ? "Actualizando…" : "Actualizar"}
          </Button>
        }
      />

      <div className="flex wrap">
        <Badge tone="accent">{roleLabel(data?.role ?? "EMPLOYEE")}</Badge>
        <Badge tone="info">
          {formatMonth(period.year, period.month)}
        </Badge>
        <span className="text-xs muted">{timezone}</span>
      </div>

      {dashboard.error ? (
        <Alert tone="error">
          {dashboard.error}
          <div className="text-xs muted" style={{ marginTop: 6 }}>
            Verifica tu sesión y tus permisos de dashboard.
          </div>
        </Alert>
      ) : null}

      {dashboard.loading && !data ? (
        <Spinner label="Cargando dashboard…" />
      ) : null}

      <div className="stat-grid">
        {canListEmployees ? (
          <StatCard
            label="Empleados activos"
            value={employees.loading ? "…" : String(activeEmployees)}
            detail="Equipo dentro de tu alcance"
          />
        ) : null}
        {canListEmployeeGoals ? (
          <StatCard
            label="Metas activas del mes"
            value={employeeGoals.loading ? "…" : String(activeGoals)}
            detail={formatMonth(period.year, period.month)}
          />
        ) : null}
        <StatCard
          label="Actividades completadas"
          value={activities.loading ? "…" : String(completedActivities.length)}
          detail={formatMonth(period.year, period.month)}
        />
        {data?.offers ? (
          <StatCard
            label="Ofertas vigentes"
            value={String(offersCount ?? 0)}
            detail="Publicadas y vigentes"
          />
        ) : null}
      </div>

      {employees.error ||
      employeeGoals.error ||
      activities.error ||
      activityTypes.error ? (
        <Alert tone="warning">
          Algunos indicadores operativos no se pudieron cargar. El dashboard
          conserva los bloques disponibles.
        </Alert>
      ) : null}

      <Card>
        <CardHeader
          title="Actividades completadas por tipo"
          description="Distribución del mes actual dentro de tu alcance."
        />
        <div className="card-body">
          {activities.loading || activityTypes.loading ? (
            <Spinner label="Cargando actividades…" />
          ) : typeCounts.length > 0 ? (
            <ActivityTypeChart data={typeCounts} />
          ) : (
            <EmptyState
              title="Sin actividades completadas"
              description="Cuando el equipo registre actividades, aquí aparecerá su distribución por tipo."
            />
          )}
        </div>
      </Card>

      {data?.metrics ? (
        data.metrics.own || data.metrics.team ? (
          <div className="grid-2">
            <MetricsCard
              title="Tus metas"
              description="Grupos propios del periodo."
              groups={data.metrics.own?.groups ?? []}
            />
            <MetricsCard
              title="Equipo directo"
              description="Grupos consolidados del equipo a tu cargo."
              groups={data.metrics.team?.groups ?? []}
            />
          </div>
        ) : (
          <MetricsCard
            title="Metas del periodo"
            description="Grupos por reglas equivalentes; no se mezclan metas incompatibles."
            groups={metricGroups}
          />
        )
      ) : (
        <Alert tone="info">
          Tu cuenta no incluye GOAL_METRICS. El dashboard muestra solo los
          bloques autorizados.
        </Alert>
      )}

      {data?.offers ? (
        <div className="grid-2">
          <Card>
            <CardHeader
              title="Última oferta"
              description="Oferta vigente publicada más recientemente."
            />
            <div className="card-body">
              {data.offers.latest ? (
                <div className="offer-card">
                  <div className="offer-media">
                    {data.offers.latest.images[0]?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={data.offers.latest.images[0].url}
                        alt={data.offers.latest.images[0].alt_text}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      "Oferta VERLA"
                    )}
                  </div>
                  <div className="flex-between">
                    <h3>{data.offers.latest.title}</h3>
                    <Badge tone="success">Vigente</Badge>
                  </div>
                  <p className="text-sm muted">{data.offers.latest.content}</p>
                  <p className="text-xs muted">
                    Publicada: {formatDate(data.offers.latest.published_at)} ·
                    Vigencia: {formatDate(data.offers.latest.starts_at)} —{" "}
                    {formatDate(data.offers.latest.ends_at)}
                  </p>
                </div>
              ) : (
                <EmptyState
                  title="Sin ofertas vigentes"
                  description="Cuando VERLA publique una oferta, aparecerá aquí."
                />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Ofertas anteriores"
              description="Ofertas vigentes publicadas antes de la más reciente."
            />
            <div className="card-body">
              {data.offers.other_current.length > 0 ? (
                <div className="offer-list">
                  {data.offers.other_current.slice(0, 5).map((offer) => (
                    <div key={offer.id} className="offer-row">
                      <div>
                        <strong>{offer.title}</strong>
                        <div className="text-xs muted">
                          Publicada: {formatDate(offer.published_at)}
                        </div>
                      </div>
                      <Badge tone="info">{statusLabel("PUBLISHED")}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Sin ofertas anteriores"
                  description="No hay otras ofertas vigentes publicadas."
                />
              )}
            </div>
          </Card>
        </div>
      ) : (
        <Alert tone="info">
          Tu cuenta no incluye OFFER_LIST. El bloque de ofertas se omite.
        </Alert>
      )}
    </>
  );
}
