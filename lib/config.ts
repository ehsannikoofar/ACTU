// Server-side configuration read from environment variables (.env, gitignored).
// Never import this from client components.
import "server-only";

function env(name: string, fallback = ""): string {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

function looksConfigured(v: string): boolean {
  return v !== "" && !v.startsWith("replace-with");
}

export const config = {
  appBaseUrl: env("APP_BASE_URL", "http://localhost:3000").replace(/\/$/, ""),
  epic: {
    fhirBaseUrl: env(
      "EPIC_FHIR_BASE_URL",
      "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
    ).replace(/\/$/, ""),
    clinicianClientId: env("EPIC_CLINICIAN_CLIENT_ID"),
    patientClientId: env("EPIC_PATIENT_CLIENT_ID"),
    mcpUrl: env("EPIC_MCP_URL"),
  },
  dataSource: (env("DATA_SOURCE", "epic") === "offline" ? "offline" : "epic") as
    | "epic"
    | "offline",
  claude: {
    model: env("CLAUDE_MODEL", "claude-opus-5-5"),
    configured: looksConfigured(env("ANTHROPIC_API_KEY")),
  },
};

export function epicClientId(role: "clinician" | "patient"): string | null {
  const id = role === "clinician" ? config.epic.clinicianClientId : config.epic.patientClientId;
  return looksConfigured(id) ? id : null;
}

export function redirectUri(role: "clinician" | "patient"): string {
  return `${config.appBaseUrl}/api/auth/callback/${role}`;
}
