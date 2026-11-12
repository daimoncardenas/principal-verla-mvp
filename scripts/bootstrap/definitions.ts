/**
 * Initial configuration definitions for the principal application.
 *
 * Everything in this module is pure: it reads the environment and returns the
 * documented seed data without touching MongoDB. The CLI entry point decides
 * whether the plan is applied.
 */

export const ORGANIZATION_NAME = "VERLA";
export const ORGANIZATION_TIMEZONE = "America/Bogota";

export interface PermissionSeed {
  code: string;
  resource: string;
  action: string;
  name: string;
}

export interface OrganizationSeed {
  name: string;
  legal_name: string;
  tax_id: string;
  contact_email: string;
  phone: string | null;
}

export interface AccountSeed {
  email: string;
  display_name: string;
  password: string | null;
  is_service: boolean;
}

export interface PartnerSeed {
  name: string;
  legal_name: string;
  document_type: string;
  document_number: string;
  contact_name: string;
  contact_email: string;
  phone: string;
  address: string | null;
  contract_reference: string | null;
}

export interface EmployeeTypeSeed {
  code: string;
  name: string;
  permission_codes: string[];
}

export interface ActivityTypeSeed {
  code: string;
  name: string;
  requires_offer: boolean;
}

export interface CitySeed {
  name: string;
  normalized_name: string;
  country_code: string;
  region_code: string;
  official_code: string | null;
}

export interface BootstrapDefinitions {
  organization: OrganizationSeed;
  organization_account: AccountSeed;
  service_account: AccountSeed;
  partner: PartnerSeed;
  partner_account: AccountSeed;
  permissions: PermissionSeed[];
  partner_enabled_permission_codes: string[];
  employee_types: EmployeeTypeSeed[];
  activity_types: ActivityTypeSeed[];
  cities: CitySeed[];
}

const PERMISSION_RESOURCES: ReadonlyArray<{
  resource: string;
  actions: readonly string[];
}> = [
  {
    resource: "PARTNER",
    actions: ["LIST", "READ", "CREATE", "UPDATE", "DELETE", "ALL"],
  },
  {
    resource: "EMPLOYEE",
    actions: [
      "LIST",
      "READ",
      "CREATE",
      "UPDATE",
      "DELETE",
      "STATUS_UPDATE",
      "ASSIGN_COORDINATOR",
      "ALL",
    ],
  },
  {
    resource: "EMPLOYEE_TYPE",
    actions: ["LIST", "READ", "CREATE", "UPDATE", "DELETE", "ALL"],
  },
  {
    resource: "GOAL",
    actions: [
      "LIST",
      "READ",
      "CREATE",
      "UPDATE",
      "DELETE",
      "ASSIGN",
      "METRICS",
      "ALL",
    ],
  },
  {
    resource: "ACTIVITY",
    actions: ["LIST", "READ", "CREATE", "UPDATE", "DELETE", "ALL"],
  },
  {
    resource: "OFFER",
    actions: [
      "LIST",
      "READ",
      "CREATE",
      "UPDATE",
      "DELETE",
      "PUBLISH",
      "DISCARD",
      "ALL",
    ],
  },
  {
    resource: "CITY",
    actions: ["LIST", "READ", "CREATE", "UPDATE", "DELETE", "ALL"],
  },
  {
    resource: "ACTIVITY_TYPE",
    actions: ["LIST", "READ", "CREATE", "UPDATE", "DELETE", "ALL"],
  },
  {
    resource: "PERMISSION",
    actions: ["LIST", "READ", "CREATE", "UPDATE", "DELETE", "ASSIGN", "ALL"],
  },
  { resource: "HISTORY", actions: ["LIST", "READ", "ALL"] },
  { resource: "DASHBOARD", actions: ["READ", "ALL"] },
  { resource: "PROFILE", actions: ["READ", "UPDATE", "ALL"] },
  { resource: "AI_SEARCH_SETTINGS", actions: ["READ", "UPDATE", "ALL"] },
  { resource: "OFFER_CHAT", actions: ["LIST", "CREATE", "ALL"] },
];

export const PERMISSION_SEEDS: PermissionSeed[] = PERMISSION_RESOURCES.flatMap(
  ({ resource, actions }) =>
    actions.map((action) => ({
      code: `${resource}_${action}`,
      resource,
      action,
      name: `${resource}_${action}`,
    })),
);

export const PARTNER_ENABLED_PERMISSION_CODES: string[] = [
  "EMPLOYEE_ALL",
  "EMPLOYEE_TYPE_ALL",
  "GOAL_ALL",
  "ACTIVITY_ALL",
  "ACTIVITY_TYPE_LIST",
  "OFFER_LIST",
  "OFFER_READ",
  "CITY_LIST",
  "CITY_READ",
  "CITY_CREATE",
  "PERMISSION_LIST",
  "PERMISSION_READ",
  "PERMISSION_ASSIGN",
  "DASHBOARD_READ",
  "PROFILE_ALL",
];

export const EMPLOYEE_TYPE_SEEDS: EmployeeTypeSeed[] = [
  {
    code: "COORDINATOR",
    name: "COORDINATOR",
    permission_codes: [
      "DASHBOARD_READ",
      "EMPLOYEE_LIST",
      "EMPLOYEE_READ",
      "EMPLOYEE_CREATE",
      "EMPLOYEE_UPDATE",
      "GOAL_LIST",
      "GOAL_READ",
      "GOAL_CREATE",
      "GOAL_UPDATE",
      "GOAL_ASSIGN",
      "GOAL_METRICS",
      "ACTIVITY_ALL",
      "ACTIVITY_TYPE_LIST",
      "OFFER_LIST",
      "OFFER_READ",
      "CITY_LIST",
      "CITY_READ",
      "PROFILE_ALL",
    ],
  },
  {
    code: "SELLER",
    name: "SELLER",
    permission_codes: [
      "DASHBOARD_READ",
      "ACTIVITY_ALL",
      "ACTIVITY_TYPE_LIST",
      "GOAL_LIST",
      "GOAL_READ",
      "GOAL_METRICS",
      "OFFER_LIST",
      "OFFER_READ",
      "CITY_LIST",
      "CITY_READ",
      "PROFILE_ALL",
    ],
  },
];

export const ACTIVITY_TYPE_SEEDS: ActivityTypeSeed[] = [
  { code: "SALE", name: "SALE", requires_offer: true },
  { code: "MEETING", name: "MEETING", requires_offer: false },
  { code: "LEAD", name: "LEAD", requires_offer: false },
  { code: "CUSTOMER_SERVICE", name: "CUSTOMER_SERVICE", requires_offer: false },
];

export const CITY_SEEDS: CitySeed[] = [
  {
    name: "Bogotá",
    normalized_name: normalizeCitySeedName("Bogotá"),
    country_code: "CO",
    region_code: "DC",
    official_code: null,
  },
  {
    name: "Medellín",
    normalized_name: normalizeCitySeedName("Medellín"),
    country_code: "CO",
    region_code: "ANT",
    official_code: null,
  },
  {
    name: "Cali",
    normalized_name: normalizeCitySeedName("Cali"),
    country_code: "CO",
    region_code: "VLL",
    official_code: null,
  },
];

export const REQUIRED_ENVIRONMENT: ReadonlyArray<{
  name: string;
  purpose: string;
}> = [
  {
    name: "BOOTSTRAP_ORGANIZATION_LEGAL_NAME",
    purpose: "Organization legal name",
  },
  { name: "BOOTSTRAP_ORGANIZATION_TAX_ID", purpose: "Organization tax id" },
  {
    name: "BOOTSTRAP_ORGANIZATION_CONTACT_EMAIL",
    purpose: "Organization contact email",
  },
  {
    name: "BOOTSTRAP_ORGANIZATION_ACCOUNT_EMAIL",
    purpose: "Organization administrator email",
  },
  {
    name: "BOOTSTRAP_ORGANIZATION_ACCOUNT_PASSWORD",
    purpose: "Organization administrator initial password",
  },
  {
    name: "BOOTSTRAP_ORGANIZATION_ACCOUNT_DISPLAY_NAME",
    purpose: "Organization administrator display name",
  },
  {
    name: "BOOTSTRAP_SERVICE_ACCOUNT_EMAIL",
    purpose: "Technical account email used as bootstrap audit actor",
  },
  {
    name: "BOOTSTRAP_SERVICE_ACCOUNT_DISPLAY_NAME",
    purpose: "Technical account display name",
  },
  { name: "BOOTSTRAP_PARTNER_NAME", purpose: "Initial partner name" },
  {
    name: "BOOTSTRAP_PARTNER_LEGAL_NAME",
    purpose: "Initial partner legal name",
  },
  {
    name: "BOOTSTRAP_PARTNER_DOCUMENT_TYPE",
    purpose: "Initial partner document type",
  },
  {
    name: "BOOTSTRAP_PARTNER_DOCUMENT_NUMBER",
    purpose: "Initial partner document number",
  },
  {
    name: "BOOTSTRAP_PARTNER_CONTACT_NAME",
    purpose: "Initial partner contact name",
  },
  {
    name: "BOOTSTRAP_PARTNER_CONTACT_EMAIL",
    purpose: "Initial partner contact email",
  },
  { name: "BOOTSTRAP_PARTNER_PHONE", purpose: "Initial partner phone" },
  {
    name: "BOOTSTRAP_PARTNER_ACCOUNT_EMAIL",
    purpose: "Initial partner account email",
  },
  {
    name: "BOOTSTRAP_PARTNER_ACCOUNT_PASSWORD",
    purpose: "Initial partner account password",
  },
  {
    name: "BOOTSTRAP_PARTNER_ACCOUNT_DISPLAY_NAME",
    purpose: "Initial partner account display name",
  },
];

export const OPTIONAL_ENVIRONMENT: ReadonlyArray<{
  name: string;
  purpose: string;
}> = [
  {
    name: "BOOTSTRAP_ORGANIZATION_PHONE",
    purpose: "Organization phone (nullable)",
  },
  {
    name: "BOOTSTRAP_PARTNER_ADDRESS",
    purpose: "Initial partner address (nullable)",
  },
  {
    name: "BOOTSTRAP_PARTNER_CONTRACT_REFERENCE",
    purpose: "Initial partner contract reference (nullable)",
  },
];

export class BootstrapConfigError extends Error {
  constructor(
    message: string,
    readonly missing: ReadonlyArray<{ name: string; purpose: string }> = [],
  ) {
    super(message);
    this.name = "BootstrapConfigError";
  }
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Mirrors backend/modules/city normalizeCityName: NFD, strip diacritics,
 * lowercase, collapse whitespace. The bootstrap test asserts parity with the
 * city service so the two cannot drift.
 */
export function normalizeCitySeedName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function requiredText(
  environment: NodeJS.ProcessEnv,
  name: string,
): string {
  const value = environment[name]?.trim();

  if (!value) {
    throw new BootstrapConfigError(`Missing required environment: ${name}`);
  }

  return value;
}

function optionalText(
  environment: NodeJS.ProcessEnv,
  name: string,
): string | null {
  const value = environment[name]?.trim();
  return value ? value : null;
}

function assertEmail(name: string, value: string): string {
  const email = normalizeEmail(value);

  if (!email) {
    throw new BootstrapConfigError(`Missing required environment: ${name}`);
  }

  return email;
}

function assertKnownPermissionCodes(codes: readonly string[]): void {
  const catalog = new Set(PERMISSION_SEEDS.map((permission) => permission.code));

  for (const code of codes) {
    if (!catalog.has(code)) {
      throw new BootstrapConfigError(
        `Seed permission code is not part of the catalog: ${code}`,
      );
    }
  }
}

export function loadDefinitions(
  environment: NodeJS.ProcessEnv = process.env,
): BootstrapDefinitions {
  const missing = REQUIRED_ENVIRONMENT.filter(
    (entry) => !environment[entry.name]?.trim(),
  );

  if (missing.length > 0) {
    throw new BootstrapConfigError(
      `Missing required environment variables: ${missing
        .map((entry) => entry.name)
        .join(", ")}`,
      missing,
    );
  }

  assertKnownPermissionCodes(PARTNER_ENABLED_PERMISSION_CODES);
  for (const employeeType of EMPLOYEE_TYPE_SEEDS) {
    assertKnownPermissionCodes(employeeType.permission_codes);
  }

  const organizationAccountEmail = assertEmail(
    "BOOTSTRAP_ORGANIZATION_ACCOUNT_EMAIL",
    requiredText(environment, "BOOTSTRAP_ORGANIZATION_ACCOUNT_EMAIL"),
  );
  const serviceAccountEmail = assertEmail(
    "BOOTSTRAP_SERVICE_ACCOUNT_EMAIL",
    requiredText(environment, "BOOTSTRAP_SERVICE_ACCOUNT_EMAIL"),
  );
  const partnerAccountEmail = assertEmail(
    "BOOTSTRAP_PARTNER_ACCOUNT_EMAIL",
    requiredText(environment, "BOOTSTRAP_PARTNER_ACCOUNT_EMAIL"),
  );

  const accountEmails = [
    organizationAccountEmail,
    serviceAccountEmail,
    partnerAccountEmail,
  ];

  if (new Set(accountEmails).size !== accountEmails.length) {
    throw new BootstrapConfigError(
      "Bootstrap account emails must be distinct",
    );
  }

  return {
    organization: {
      name: ORGANIZATION_NAME,
      legal_name: requiredText(
        environment,
        "BOOTSTRAP_ORGANIZATION_LEGAL_NAME",
      ),
      tax_id: requiredText(environment, "BOOTSTRAP_ORGANIZATION_TAX_ID"),
      contact_email: assertEmail(
        "BOOTSTRAP_ORGANIZATION_CONTACT_EMAIL",
        requiredText(environment, "BOOTSTRAP_ORGANIZATION_CONTACT_EMAIL"),
      ),
      phone: optionalText(environment, "BOOTSTRAP_ORGANIZATION_PHONE"),
    },
    organization_account: {
      email: organizationAccountEmail,
      display_name: requiredText(
        environment,
        "BOOTSTRAP_ORGANIZATION_ACCOUNT_DISPLAY_NAME",
      ),
      password: requiredText(
        environment,
        "BOOTSTRAP_ORGANIZATION_ACCOUNT_PASSWORD",
      ),
      is_service: false,
    },
    service_account: {
      email: serviceAccountEmail,
      display_name: requiredText(
        environment,
        "BOOTSTRAP_SERVICE_ACCOUNT_DISPLAY_NAME",
      ),
      password: null,
      is_service: true,
    },
    partner: {
      name: requiredText(environment, "BOOTSTRAP_PARTNER_NAME"),
      legal_name: requiredText(environment, "BOOTSTRAP_PARTNER_LEGAL_NAME"),
      document_type: requiredText(
        environment,
        "BOOTSTRAP_PARTNER_DOCUMENT_TYPE",
      ),
      document_number: requiredText(
        environment,
        "BOOTSTRAP_PARTNER_DOCUMENT_NUMBER",
      ),
      contact_name: requiredText(
        environment,
        "BOOTSTRAP_PARTNER_CONTACT_NAME",
      ),
      contact_email: assertEmail(
        "BOOTSTRAP_PARTNER_CONTACT_EMAIL",
        requiredText(environment, "BOOTSTRAP_PARTNER_CONTACT_EMAIL"),
      ),
      phone: requiredText(environment, "BOOTSTRAP_PARTNER_PHONE"),
      address: optionalText(environment, "BOOTSTRAP_PARTNER_ADDRESS"),
      contract_reference: optionalText(
        environment,
        "BOOTSTRAP_PARTNER_CONTRACT_REFERENCE",
      ),
    },
    partner_account: {
      email: partnerAccountEmail,
      display_name: requiredText(
        environment,
        "BOOTSTRAP_PARTNER_ACCOUNT_DISPLAY_NAME",
      ),
      password: requiredText(
        environment,
        "BOOTSTRAP_PARTNER_ACCOUNT_PASSWORD",
      ),
      is_service: false,
    },
    permissions: PERMISSION_SEEDS,
    partner_enabled_permission_codes: PARTNER_ENABLED_PERMISSION_CODES,
    employee_types: EMPLOYEE_TYPE_SEEDS,
    activity_types: ACTIVITY_TYPE_SEEDS,
    cities: CITY_SEEDS,
  };
}

export type BootstrapAccountRole =
  | "organization_account"
  | "service_account"
  | "partner_account";

export interface BootstrapAccountRef {
  role: BootstrapAccountRole;
  seed: AccountSeed;
}

export function accountSeeds(
  definitions: BootstrapDefinitions,
): BootstrapAccountRef[] {
  return [
    {
      role: "organization_account",
      seed: definitions.organization_account,
    },
    { role: "service_account", seed: definitions.service_account },
    { role: "partner_account", seed: definitions.partner_account },
  ];
}
