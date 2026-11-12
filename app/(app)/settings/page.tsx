"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

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
  Tabs,
  Textarea,
} from "../../components/ui";
import { apiFetch, errorMessage } from "../../lib/api";
import { roleLabel } from "../../lib/format";
import { useApiData } from "../../lib/hooks";
import { hasPermission } from "../../lib/permissions";
import type {
  City,
  Employee,
  EmployeeType,
  Permission,
  ProfileResponse,
} from "../../lib/types";

interface BugReport {
  id: string;
  title: string;
  description: string;
}

export default function SettingsPage() {
  const session = useSession();
  const router = useRouter();
  const isPartner = session.account_type === "PARTNER";
  const profile = useApiData<ProfileResponse>("/api/profile");
  const employeeTypes = useApiData<{ employee_types: EmployeeType[] }>(
    hasPermission(session.permissions, "EMPLOYEE_TYPE_LIST")
      ? "/api/employee-types"
      : null,
  );
  const permissions = useApiData<{ permissions: Permission[] }>(
    hasPermission(session.permissions, "PERMISSION_LIST")
      ? "/api/permissions"
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

  const canAssignSupervisor = hasPermission(
    session.permissions,
    "EMPLOYEE_ASSIGN_COORDINATOR",
  );
  const canCreateRole = hasPermission(
    session.permissions,
    "EMPLOYEE_TYPE_CREATE",
  );
  const canListRoles = hasPermission(
    session.permissions,
    "EMPLOYEE_TYPE_LIST",
  );
  const [tab, setTab] = useState("profile");
  const [loggingOut, setLoggingOut] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const [roleOpen, setRoleOpen] = useState(false);
  const [roleCode, setRoleCode] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [rolePermissionIds, setRolePermissionIds] = useState<string[]>([]);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const [supervisorOpen, setSupervisorOpen] = useState(false);
  const [sellerId, setSellerId] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [supervisorSaving, setSupervisorSaving] = useState(false);
  const [supervisorError, setSupervisorError] = useState<string | null>(null);

  const [bugTitle, setBugTitle] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [bugReports, setBugReports] = useState<BugReport[]>([]);

  useEffect(() => {
    const data = profile.data;

    if (!data) return;

    setDisplayName(data.account.display_name);
    setContactName(data.partner?.contact_name ?? "");
    setContactEmail(data.partner?.contact_email ?? "");
    setAddress(data.partner?.address ?? "");
    setFirstName(data.employee?.first_name ?? "");
    setLastName(data.employee?.last_name ?? "");
    setPhone(data.employee?.phone ?? "");
    setJobTitle(data.employee?.job_title ?? "");
  }, [profile.data]);

  const employeeTypeNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const type of employeeTypes.data?.employee_types ?? []) {
      map.set(type.id, type.code);
    }
    return map;
  }, [employeeTypes.data]);
  const permissionNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const permission of permissions.data?.permissions ?? []) {
      map.set(permission.id, permission.code);
    }
    return map;
  }, [permissions.data]);
  const sellers = useMemo(
    () =>
      (employees.data?.employees ?? []).filter(
        (employee) =>
          employee.status === "ACTIVE" &&
          employeeTypeNames.get(employee.employee_type_id) === "SELLER",
      ),
    [employees.data, employeeTypeNames],
  );
  const coordinators = useMemo(
    () =>
      (employees.data?.employees ?? []).filter(
        (employee) =>
          employee.status === "ACTIVE" &&
          employeeTypeNames.get(employee.employee_type_id) === "COORDINATOR",
      ),
    [employees.data, employeeTypeNames],
  );
  const selectedSeller = sellers.find((employee) => employee.id === sellerId);

  const tabs = [
    { id: "profile", label: "Perfil" },
    ...(isPartner && canListRoles
      ? [{ id: "roles", label: "Tipos de empleado" }]
      : []),
    ...(isPartner && hasPermission(session.permissions, "PERMISSION_LIST")
      ? [{ id: "permissions", label: "Permisos adicionales" }]
      : []),
    ...(isPartner && hasPermission(session.permissions, "CITY_LIST")
      ? [{ id: "cities", label: "Ciudades" }]
      : []),
    ...(isPartner && canAssignSupervisor
      ? [{ id: "coordinator", label: "Asignar coordinador" }]
      : []),
    { id: "bugs", label: "Reportar bug" },
  ];

  async function logout() {
    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/sign-in");
      router.refresh();
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setPasswordSaving(true);

    try {
      await apiFetch("/api/profile/password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          expectedVersion: profile.data?.account.version ?? 0,
        }),
      });
      router.replace("/sign-in");
      router.refresh();
    } catch (cause) {
      setPasswordError(errorMessage(cause));
    } finally {
      setPasswordSaving(false);
    }
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError(null);

    const data = profile.data;

    if (!data) {
      setProfileSaving(false);
      return;
    }

    const payload: Record<string, unknown> = {
      expectedVersion: data.account.version,
      display_name: displayName.trim(),
    };

    if (isPartner && data.partner) {
      payload.expectedProfileVersion = data.partner.version;
      payload.contact_name = contactName.trim();
      payload.contact_email = contactEmail.trim();
      payload.address = address.trim() || null;
    }

    if (!isPartner && data.employee) {
      payload.expectedProfileVersion = data.employee.version;
      payload.first_name = firstName.trim();
      payload.last_name = lastName.trim();
      payload.phone = phone.trim();
      payload.job_title = jobTitle.trim();
    }

    try {
      await apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      profile.reload();
    } catch (cause) {
      setProfileError(errorMessage(cause));
    } finally {
      setProfileSaving(false);
    }
  }

  async function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRoleSaving(true);
    setRoleError(null);

    try {
      await apiFetch("/api/employee-types", {
        method: "POST",
        body: JSON.stringify({
          code: roleCode.trim(),
          name: roleName.trim(),
          description: roleDescription.trim() || null,
          permission_ids: rolePermissionIds,
        }),
      });
      setRoleOpen(false);
      setRoleCode("");
      setRoleName("");
      setRoleDescription("");
      setRolePermissionIds([]);
      employeeTypes.reload();
    } catch (cause) {
      setRoleError(errorMessage(cause));
    } finally {
      setRoleSaving(false);
    }
  }

  async function assignSupervisor() {
    if (!selectedSeller || !supervisorId) return;
    setSupervisorSaving(true);
    setSupervisorError(null);

    try {
      await apiFetch(`/api/employees/${selectedSeller.id}/supervisor`, {
        method: "POST",
        body: JSON.stringify({
          expectedVersion: selectedSeller.version,
          supervisor_id: supervisorId,
        }),
      });
      setSupervisorOpen(false);
      setSellerId("");
      setSupervisorId("");
      employees.reload();
    } catch (cause) {
      setSupervisorError(errorMessage(cause));
    } finally {
      setSupervisorSaving(false);
    }
  }

  function addBugReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!bugTitle.trim() || !bugDescription.trim()) return;

    setBugReports((current) => [
      {
        id: crypto.randomUUID(),
        title: bugTitle.trim(),
        description: bugDescription.trim(),
      },
      ...current,
    ]);
    setBugTitle("");
    setBugDescription("");
  }

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Perfil, catálogos y reportes de la cuenta."
        actions={
          <Button variant="secondary" onClick={logout} disabled={loggingOut}>
            {loggingOut ? "Saliendo…" : "Cerrar sesión"}
          </Button>
        }
      />

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "profile" ? (
        <div className="grid-2">
          <Card>
            <CardHeader
              title="Perfil"
              description="Datos de la cuenta autenticada."
            />
            <div className="card-body">
              {profile.error ? (
                <Alert tone="error">{profile.error}</Alert>
              ) : null}
              {profile.loading ? (
                <Spinner label="Cargando perfil…" />
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <tbody>
                      <tr>
                        <th>Nombre</th>
                        <td>{profile.data?.account.display_name ?? session.display_name}</td>
                      </tr>
                      <tr>
                        <th>Correo</th>
                        <td>{profile.data?.account.email ?? session.email}</td>
                      </tr>
                      <tr>
                        <th>Rol</th>
                        <td>{session.role_name ?? roleLabel(session.account_type)}</td>
                      </tr>
                      <tr>
                        <th>Organización</th>
                        <td>{session.organization.name}</td>
                      </tr>
                      <tr>
                        <th>Zona horaria</th>
                        <td>{session.organization.timezone}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Cambiar contraseña"
              description="Al guardar se cierra la sesión y vuelves al acceso."
            />
            <div className="card-body">
              <form className="stack" onSubmit={changePassword}>
                {passwordError ? (
                  <Alert tone="error">{passwordError}</Alert>
                ) : null}
                <Field label="Contraseña actual" htmlFor="current_password">
                  <Input
                    id="current_password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                  />
                </Field>
                <Field label="Contraseña nueva" htmlFor="new_password">
                  <Input
                    id="new_password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                  />
                </Field>
                <Field label="Confirmar contraseña nueva" htmlFor="confirm_password">
                  <Input
                    id="confirm_password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </Field>
                <Button type="submit" disabled={passwordSaving}>
                  {passwordSaving ? "Guardando…" : "Cambiar contraseña"}
                </Button>
              </form>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "profile" ? (
        isPartner ? (
        <Card>
          <CardHeader
            title="Editar perfil del aliado"
            description="Datos de contacto visibles para la organización."
          />
          <div className="card-body">
            <form className="stack" onSubmit={updateProfile}>
              {profileError ? <Alert tone="error">{profileError}</Alert> : null}
              <div className="form-grid">
                <Field label="Nombre visible" htmlFor="profile_display_name">
                  <Input
                    id="profile_display_name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    required
                  />
                </Field>
                <Field label="Contacto" htmlFor="profile_contact_name">
                  <Input
                    id="profile_contact_name"
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    required
                  />
                </Field>
                <Field label="Correo de contacto" htmlFor="profile_contact_email">
                  <Input
                    id="profile_contact_email"
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    required
                  />
                </Field>
                <Field label="Dirección" htmlFor="profile_address">
                  <Input
                    id="profile_address"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                  />
                </Field>
              </div>
              <Button type="submit" disabled={profileSaving}>
                {profileSaving ? "Guardando…" : "Guardar perfil"}
              </Button>
            </form>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Editar perfil"
            description="Datos personales del empleado."
          />
          <div className="card-body">
            <form className="stack" onSubmit={updateProfile}>
              {profileError ? <Alert tone="error">{profileError}</Alert> : null}
              <div className="form-grid">
                <Field label="Nombre visible" htmlFor="profile_display_name">
                  <Input
                    id="profile_display_name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    required
                  />
                </Field>
                <Field label="Nombres" htmlFor="profile_first_name">
                  <Input
                    id="profile_first_name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    required
                  />
                </Field>
                <Field label="Apellidos" htmlFor="profile_last_name">
                  <Input
                    id="profile_last_name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    required
                  />
                </Field>
                <Field label="Teléfono" htmlFor="profile_phone">
                  <Input
                    id="profile_phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    required
                  />
                </Field>
                <Field label="Cargo" htmlFor="profile_job_title">
                  <Input
                    id="profile_job_title"
                    value={jobTitle}
                    onChange={(event) => setJobTitle(event.target.value)}
                    required
                  />
                </Field>
              </div>
              <Button type="submit" disabled={profileSaving}>
                {profileSaving ? "Guardando…" : "Guardar perfil"}
              </Button>
            </form>
          </div>
        </Card>
      )
      ) : null}

      {tab === "roles" ? (
        <Card>
          <CardHeader
            title="Tipos de empleado"
            description="Roles disponibles para el alta y sus permisos base."
            actions={
              canCreateRole ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setRoleError(null);
                    setRoleOpen(true);
                  }}
                >
                  + Crear tipo
                </Button>
              ) : undefined
            }
          />
          <div className="card-body">
            {employeeTypes.error ? (
              <Alert tone="error">{employeeTypes.error}</Alert>
            ) : null}
            {employeeTypes.loading ? (
              <Spinner label="Cargando tipos…" />
            ) : (employeeTypes.data?.employee_types.length ?? 0) === 0 ? (
              <EmptyState
                title="Sin tipos de empleado"
                description="Crea el primer tipo para asignar roles al equipo."
              />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Descripción</th>
                      <th>Permisos</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(employeeTypes.data?.employee_types ?? []).map((type) => (
                      <tr key={type.id}>
                        <td>
                          <div className="cell-stack">
                            <strong>{type.name}</strong>
                            <span className="mono">{type.code}</span>
                          </div>
                        </td>
                        <td>{type.description ?? "—"}</td>
                        <td>{type.permission_ids.length}</td>
                        <td>
                          <Badge tone={type.is_active ? "success" : "warning"}>
                            {type.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      ) : null}

      {tab === "permissions" ? (
        <Card>
          <CardHeader
            title="Permisos adicionales"
            description="Los permisos extra se asignan desde la edición de cada empleado."
          />
          <div className="card-body">
            {employees.loading ? <Spinner label="Cargando empleados…" /> : null}
            {employees.error ? <Alert tone="error">{employees.error}</Alert> : null}
            {!employees.loading &&
            (employees.data?.employees.filter(
              (employee) => (employee.additional_permission?.length ?? 0) > 0,
            ).length ?? 0) === 0 ? (
              <EmptyState
                title="Sin permisos adicionales"
                description="Ningún empleado tiene permisos extra asignados."
              />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Permisos adicionales</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(employees.data?.employees ?? [])
                      .filter(
                        (employee) =>
                          (employee.additional_permission?.length ?? 0) > 0,
                      )
                      .map((employee) => (
                        <tr key={employee.id}>
                          <td>
                            {employee.first_name} {employee.last_name}
                          </td>
                          <td>
                            {(employee.additional_permission ?? [])
                              .map((id) => permissionNames.get(id) ?? id.slice(-6))
                              .join(", ")}
                          </td>
                          <td>
                            <Link
                              href={`/employees/${employee.id}`}
                              className="btn btn-ghost btn-sm"
                            >
                              Editar
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      ) : null}

      {tab === "cities" ? (
        <Card>
          <CardHeader
            title="Ciudades"
            description="Catálogo disponible para la operación del aliado."
          />
          <div className="card-body">
            {cities.error ? <Alert tone="error">{cities.error}</Alert> : null}
            {cities.loading ? <Spinner label="Cargando ciudades…" /> : null}
            {!cities.loading && (cities.data?.cities.length ?? 0) === 0 ? (
              <EmptyState
                title="Sin ciudades"
                description="La organización debe configurar el catálogo de ciudades."
              />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ciudad</th>
                      <th>Región</th>
                      <th>País</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cities.data?.cities ?? []).map((city) => (
                      <tr key={city.id}>
                        <td>{city.name}</td>
                        <td>{city.region_code}</td>
                        <td>{city.country_code}</td>
                        <td>
                          <Badge tone={city.is_active ? "success" : "warning"}>
                            {city.is_active ? "Activa" : "Inactiva"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      ) : null}

      {tab === "coordinator" ? (
        <Card>
          <CardHeader
            title="Asignar coordinador"
            description="Cambia el supervisor vigente de un vendedor."
            actions={
              <Button
                size="sm"
                onClick={() => {
                  setSupervisorError(null);
                  setSupervisorOpen(true);
                }}
              >
                Asignar
              </Button>
            }
          />
          <div className="card-body">
            <p className="text-sm muted">
              El cambio de supervisor cierra la asignación vigente y crea una nueva
              en la misma operación. No concede permisos adicionales.
            </p>
          </div>
        </Card>
      ) : null}

      {tab === "bugs" ? (
        <div className="grid-2">
          <Card>
            <CardHeader
              title="Reportar bug"
              description="Registra un problema para revisión del equipo."
            />
            <div className="card-body">
              <form className="stack" onSubmit={addBugReport}>
                <Field label="Título" htmlFor="bug_title">
                  <Input
                    id="bug_title"
                    value={bugTitle}
                    onChange={(event) => setBugTitle(event.target.value)}
                    required
                  />
                </Field>
                <Field label="Descripción" htmlFor="bug_description">
                  <Textarea
                    id="bug_description"
                    value={bugDescription}
                    onChange={(event) => setBugDescription(event.target.value)}
                    required
                  />
                </Field>
                <Button type="submit">Registrar reporte</Button>
              </form>
            </div>
          </Card>
          <Card>
            <CardHeader
              title="Reportes de esta sesión"
              description="Aún no hay una colección canónica de reportes; este listado es local."
            />
            <div className="card-body stack">
              {bugReports.length === 0 ? (
                <EmptyState
                  title="Sin reportes"
                  description="Los reportes registrados aquí se muestran solo en esta sesión."
                />
              ) : (
                bugReports.map((report) => (
                  <div key={report.id} className="stack-sm">
                    <strong>{report.title}</strong>
                    <p className="text-sm muted">{report.description}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      ) : null}

      <Modal
        open={roleOpen}
        title="Crear tipo de empleado"
        onClose={() => setRoleOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setRoleOpen(false)}
              disabled={roleSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" form="role-form" disabled={roleSaving}>
              {roleSaving ? "Creando…" : "Crear tipo"}
            </Button>
          </>
        }
      >
        <form id="role-form" className="stack" onSubmit={createRole}>
          {roleError ? <Alert tone="error">{roleError}</Alert> : null}
          <Field label="Código" htmlFor="role_code">
            <Input
              id="role_code"
              value={roleCode}
              onChange={(event) => setRoleCode(event.target.value)}
              required
            />
          </Field>
          <Field label="Nombre" htmlFor="role_name">
            <Input
              id="role_name"
              value={roleName}
              onChange={(event) => setRoleName(event.target.value)}
              required
            />
          </Field>
          <Field label="Descripción" htmlFor="role_description">
            <Textarea
              id="role_description"
              value={roleDescription}
              onChange={(event) => setRoleDescription(event.target.value)}
            />
          </Field>
          <div className="stack-sm">
            <strong>Permisos base</strong>
            <div className="checkbox-grid">
              {(permissions.data?.permissions ?? []).map((permission) => (
                <label key={permission.id} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={rolePermissionIds.includes(permission.id)}
                    onChange={() =>
                      setRolePermissionIds((current) =>
                        current.includes(permission.id)
                          ? current.filter((id) => id !== permission.id)
                          : [...current, permission.id],
                      )
                    }
                  />
                  <span>
                    <strong>{permission.code}</strong>
                    <br />
                    <span className="muted text-xs">{permission.name}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={supervisorOpen}
        title="Asignar coordinador"
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
              onClick={assignSupervisor}
              disabled={supervisorSaving || !sellerId || !supervisorId}
            >
              {supervisorSaving ? "Guardando…" : "Asignar"}
            </Button>
          </>
        }
      >
        <div className="stack">
          {supervisorError ? <Alert tone="error">{supervisorError}</Alert> : null}
          <Field label="Vendedor" htmlFor="coordinator_seller">
            <Select
              id="coordinator_seller"
              value={sellerId}
              onChange={(event) => setSellerId(event.target.value)}
              required
            >
              <option value="">Selecciona un vendedor</option>
              {sellers.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.first_name} {employee.last_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Coordinador" htmlFor="coordinator_supervisor">
            <Select
              id="coordinator_supervisor"
              value={supervisorId}
              onChange={(event) => setSupervisorId(event.target.value)}
              required
            >
              <option value="">Selecciona un coordinador</option>
              {coordinators.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.first_name} {employee.last_name}
                </option>
              ))}
            </Select>
          </Field>
          {selectedSeller ? (
            <p className="hint">
              El vendedor quedará bajo el coordinador seleccionado desde el momento
              del cambio.
            </p>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
