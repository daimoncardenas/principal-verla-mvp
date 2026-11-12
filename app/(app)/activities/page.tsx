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
  formatDateTime,
  statusLabel,
  toDateTimeInputValue,
} from "../../lib/format";
import { useApiData } from "../../lib/hooks";
import { hasPermission } from "../../lib/permissions";
import type {
  Activity,
  ActivityType,
  City,
  Employee,
  Offer,
} from "../../lib/types";

function statusTone(status: string) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "CANCELLED") return "danger" as const;
  return "neutral" as const;
}

export default function ActivitiesPage() {
  const session = useSession();
  const canList = hasPermission(session.permissions, "ACTIVITY_LIST");
  const canCreate = hasPermission(session.permissions, "ACTIVITY_CREATE");
  const canListEmployees = hasPermission(
    session.permissions,
    "EMPLOYEE_LIST",
  );
  const canListTypes = hasPermission(
    session.permissions,
    "ACTIVITY_TYPE_LIST",
  );
  const canListCities = hasPermission(session.permissions, "CITY_LIST");
  const canListOffers = hasPermission(session.permissions, "OFFER_LIST");

  const activities = useApiData<{ activities: Activity[] }>(
    canList ? "/api/activities" : null,
  );
  const employees = useApiData<{ employees: Employee[] }>(
    canListEmployees ? "/api/employees" : null,
  );
  const activityTypes = useApiData<{ activity_types: ActivityType[] }>(
    canListTypes ? "/api/activity-types" : null,
  );
  const cities = useApiData<{ cities: City[] }>(
    canListCities ? "/api/cities" : null,
  );
  const offers = useApiData<{ offers: Offer[] }>(
    canListOffers ? "/api/offers" : null,
  );

  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [activityTypeId, setActivityTypeId] = useState("");
  const [cityId, setCityId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [performedAt, setPerformedAt] = useState(
    toDateTimeInputValue(new Date().toISOString()),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const offerTitles = useMemo(() => {
    const map = new Map<string, string>();
    for (const offer of offers.data?.offers ?? []) {
      map.set(offer.id, offer.title);
    }
    return map;
  }, [offers.data]);

  const selectedType = typeNames.get(activityTypeId);
  const filtered = useMemo(() => {
    return (activities.data?.activities ?? []).filter((activity) => {
      if (typeFilter && activity.activity_type_id !== typeFilter) return false;
      if (statusFilter && activity.status !== statusFilter) return false;
      return true;
    });
  }, [activities.data, typeFilter, statusFilter]);

  function resetForm() {
    setEmployeeId(
      canListEmployees
        ? employees.data?.employees[0]?.id ?? ""
        : "",
    );
    setActivityTypeId(
      activityTypes.data?.activity_types[0]?.id ?? "",
    );
    setCityId(cities.data?.cities[0]?.id ?? "");
    setOfferId("");
    setTitle("");
    setDescription("");
    setPerformedAt(toDateTimeInputValue(new Date().toISOString()));
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (canListEmployees && !employeeId) {
        throw new Error("Selecciona un empleado.");
      }
      if (!activityTypeId || !cityId) {
        throw new Error("Selecciona el tipo de actividad y la ciudad.");
      }
      if (selectedType?.requires_offer && !offerId) {
        throw new Error("Esta actividad exige una oferta publicada vigente.");
      }

      await apiFetch("/api/activities", {
        method: "POST",
        body: JSON.stringify({
          ...(canListEmployees ? { employee_id: employeeId } : {}),
          activity_type_id: activityTypeId,
          city_id: cityId,
          offer_id: selectedType?.requires_offer ? offerId : null,
          title: title.trim(),
          description: description.trim() || null,
          performed_at: new Date(performedAt).toISOString(),
          idempotency_key: crypto.randomUUID(),
        }),
      });
      setOpen(false);
      activities.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  if (!canList) {
    return (
      <>
        <PageHeader title="Actividades" />
        <Alert tone="error">
          Tu cuenta no tiene permiso ACTIVITY_LIST para consultar actividades.
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Actividades"
        description="Registro diario del equipo: visitas, reuniones, ventas y servicio."
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                resetForm();
                setOpen(true);
              }}
            >
              + Registrar actividad
            </Button>
          ) : undefined
        }
      />

      <div className="stat-grid">
        <StatCard
          label="Actividades"
          value={String(activities.data?.activities.length ?? 0)}
        />
        <StatCard
          label="Completadas"
          value={String(
            (activities.data?.activities ?? []).filter(
              (activity) => activity.status === "COMPLETED",
            ).length,
          )}
        />
        <StatCard
          label="Canceladas"
          value={String(
            (activities.data?.activities ?? []).filter(
              (activity) => activity.status === "CANCELLED",
            ).length,
          )}
        />
      </div>

      <Card>
        <CardHeader
          title="Actividades registradas"
          description="El servidor resuelve la asignación vigente y la oferta al registrar una venta."
        />
        <div className="card-body stack">
          <div className="form-grid">
            <Select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              aria-label="Filtrar por tipo"
            >
              <option value="">Todos los tipos</option>
              {(activityTypes.data?.activity_types ?? []).map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filtrar por estado"
            >
              <option value="">Todos los estados</option>
              <option value="COMPLETED">Completada</option>
              <option value="CANCELLED">Cancelada</option>
            </Select>
          </div>

          {activities.error ? (
            <Alert tone="error">{activities.error}</Alert>
          ) : null}
          {activities.loading ? (
            <Spinner label="Cargando actividades…" />
          ) : null}
          {!activities.loading && filtered.length === 0 ? (
            <EmptyState
              title="Sin actividades"
              description="No hay actividades que coincidan con los filtros."
              action={
                canCreate ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      resetForm();
                      setOpen(true);
                    }}
                  >
                    Registrar la primera
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
                    <th>Fecha</th>
                    <th>Empleado</th>
                    <th>Tipo</th>
                    <th>Oferta</th>
                    <th>Estado</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((activity) => (
                    <tr key={activity.id}>
                      <td>{formatDateTime(activity.performed_at)}</td>
                      <td>
                        {activity.employee_id === session.employee_id
                          ? `${session.display_name} (tú)`
                          : employeeNames.get(activity.employee_id) ?? "—"}
                      </td>
                      <td>
                        {typeNames.get(activity.activity_type_id)?.code ?? "—"}
                      </td>
                      <td>
                        {activity.offer_snapshot?.title ??
                          (activity.offer_id
                            ? offerTitles.get(activity.offer_id) ?? "—"
                            : "—")}
                      </td>
                      <td>
                        <Badge tone={statusTone(activity.status)}>
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

      <Modal
        open={open}
        title="Registrar actividad"
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
            <Button type="submit" form="activity-form" disabled={saving}>
              {saving ? "Registrando…" : "Registrar actividad"}
            </Button>
          </>
        }
      >
        <form id="activity-form" className="stack" onSubmit={submit}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          {canListEmployees ? (
            <Field label="Empleado" htmlFor="activity_employee">
              <Select
                id="activity_employee"
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
                required
              >
                <option value="">Selecciona un empleado</option>
                {(employees.data?.employees ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <p className="hint">
              La actividad se registrará a nombre de {session.display_name}.
            </p>
          )}
          <Field label="Tipo de actividad" htmlFor="activity_type">
            <Select
              id="activity_type"
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
          {selectedType?.requires_offer ? (
            <Field
              label="Oferta"
              htmlFor="activity_offer"
              hint="Solo se muestran ofertas publicadas y vigentes."
            >
              <Select
                id="activity_offer"
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
          <Field label="Ciudad" htmlFor="activity_city">
            <Select
              id="activity_city"
              value={cityId}
              onChange={(event) => setCityId(event.target.value)}
              required
            >
              <option value="">Selecciona una ciudad</option>
              {(cities.data?.cities ?? []).map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Título" htmlFor="activity_title">
            <Input
              id="activity_title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Visita a cliente"
              required
            />
          </Field>
          <Field label="Fecha y hora" htmlFor="activity_performed_at">
            <Input
              id="activity_performed_at"
              type="datetime-local"
              value={performedAt}
              onChange={(event) => setPerformedAt(event.target.value)}
              required
            />
          </Field>
          <Field label="Descripción" htmlFor="activity_description">
            <Textarea
              id="activity_description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
        </form>
      </Modal>
    </>
  );
}
