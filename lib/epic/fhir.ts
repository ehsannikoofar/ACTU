// Minimal FHIR R4 client for the Epic sandbox, plus an offline source with bundled sample data.
import "server-only";
import { config } from "@/lib/config";
import type { EpicToken } from "@/lib/session";
import { OFFLINE } from "./offline-data";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Resource = { resourceType: string; id?: string; [k: string]: any };
export interface Bundle { resourceType: "Bundle"; entry?: { resource?: Resource }[]; link?: { relation: string; url: string }[] }

export class FhirError extends Error {
  constructor(public status: number, public summary: string) {
    super(`FHIR ${status}: ${summary}`);
  }
}

export interface FhirSource {
  kind: "epic" | "offline";
  read(type: string, id: string): Promise<Resource>;
  search(type: string, params: Record<string, string>): Promise<Resource[]>;
  create(type: string, resource: Resource): Promise<{ id?: string; location?: string }>;
  readBinaryText(urlOrRef: string): Promise<string | null>;
}

function outcomeSummary(body: string): string {
  // Keep only issue codes/diagnostics — never echo submitted content.
  try {
    const oo = JSON.parse(body) as { issue?: { severity?: string; code?: string; details?: { text?: string }; diagnostics?: string }[] };
    return (oo.issue ?? [])
      .map((i) => [i.severity, i.code, i.details?.text, i.diagnostics].filter(Boolean).join(" "))
      .join("; ")
      .slice(0, 300) || "no OperationOutcome";
  } catch {
    return body.slice(0, 120);
  }
}

class EpicFhir implements FhirSource {
  kind = "epic" as const;
  constructor(private token: EpicToken) {}

  private async req(url: string, init?: RequestInit): Promise<Response> {
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/fhir+json",
        Authorization: `Bearer ${this.token.accessToken}`,
        ...(init?.body ? { "Content-Type": "application/fhir+json" } : {}),
        ...init?.headers,
      },
      cache: "no-store",
    });
    if (!res.ok) throw new FhirError(res.status, outcomeSummary(await res.text()));
    return res;
  }

  async read(type: string, id: string): Promise<Resource> {
    return (await this.req(`${config.epic.fhirBaseUrl}/${type}/${encodeURIComponent(id)}`)).json();
  }

  async search(type: string, params: Record<string, string>): Promise<Resource[]> {
    const qs = new URLSearchParams(params).toString();
    let url: string | undefined = `${config.epic.fhirBaseUrl}/${type}?${qs}`;
    const out: Resource[] = [];
    for (let page = 0; url && page < 3; page++) {
      const b = (await (await this.req(url)).json()) as Bundle;
      for (const e of b.entry ?? []) if (e.resource && e.resource.resourceType === type) out.push(e.resource);
      url = b.link?.find((l) => l.relation === "next")?.url;
    }
    return out;
  }

  async create(type: string, resource: Resource): Promise<{ id?: string; location?: string }> {
    const res = await this.req(`${config.epic.fhirBaseUrl}/${type}`, { method: "POST", body: JSON.stringify(resource) });
    const location = res.headers.get("location") ?? undefined;
    const id = location?.match(new RegExp(`${type}/([^/]+)`))?.[1];
    return { id, location };
  }

  async readBinaryText(urlOrRef: string): Promise<string | null> {
    const url = urlOrRef.startsWith("http") ? urlOrRef : `${config.epic.fhirBaseUrl}/${urlOrRef}`;
    const res = await this.req(url, { headers: { Accept: "text/plain, text/html, application/fhir+json" } });
    const ct = res.headers.get("content-type") ?? "";
    const text = await res.text();
    if (ct.includes("json")) {
      try {
        const b = JSON.parse(text) as { data?: string };
        return b.data ? Buffer.from(b.data, "base64").toString("utf8") : null;
      } catch {
        return null;
      }
    }
    return ct.includes("html") ? text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : text;
  }
}

class OfflineFhir implements FhirSource {
  kind = "offline" as const;
  async read(type: string, id: string): Promise<Resource> {
    const r = OFFLINE.find((x) => x.resourceType === type && x.id === id);
    if (!r) throw new FhirError(404, "not found in offline sample data");
    return r;
  }
  async search(type: string, params: Record<string, string>): Promise<Resource[]> {
    const pid = params.patient ?? params.subject?.replace("Patient/", "");
    return OFFLINE.filter((x) => x.resourceType === type && (!pid || x.subject?.reference === `Patient/${pid}` || x.patient?.reference === `Patient/${pid}`))
      .filter((x) => !params.category || JSON.stringify(x.category ?? "").includes(params.category));
  }
  async create(): Promise<{ id?: string }> {
    throw new FhirError(0, "offline mode: no writes to Epic");
  }
  async readBinaryText(): Promise<string | null> {
    return null;
  }
}

export function fhirSource(token: EpicToken | undefined | null): FhirSource | null {
  if (config.dataSource === "offline") return new OfflineFhir();
  return token ? new EpicFhir(token) : null;
}

/** Human display name from a FHIR Patient. */
export function patientName(p: Resource | null | undefined): string | null {
  const n = p?.name?.find((x: { use?: string }) => x.use === "official") ?? p?.name?.[0];
  if (!n) return null;
  return n.text ?? [...(n.given ?? []), n.family].filter(Boolean).join(" ");
}
