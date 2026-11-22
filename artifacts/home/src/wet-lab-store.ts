// Lightweight, zero-dependency Cloud Firestore REST adapter for Cloud Run.
// Automatically uses Cloud Run's built-in service account identity when FIRESTORE_ENABLED=true,
// and degrades cleanly to in-memory storage during local development or CI.

const METADATA_TOKEN_URL =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";

async function getAccessToken(): Promise<string | null> {
  if (process.env.GCP_ACCESS_TOKEN) return process.env.GCP_ACCESS_TOKEN;
  try {
    const res = await fetch(METADATA_TOKEN_URL, {
      headers: { "Metadata-Flavor": "Google" },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

export function isFirestoreEnabled(): boolean {
  return process.env.FIRESTORE_ENABLED === "true" && Boolean(process.env.GOOGLE_CLOUD_PROJECT);
}

export async function saveWetLabSnapshot(docId: string, payload: unknown): Promise<{ persisted: boolean; backend: string }> {
  if (!isFirestoreEnabled()) {
    return { persisted: false, backend: "in-memory-v1" };
  }
  const project = process.env.GOOGLE_CLOUD_PROJECT!;
  const token = await getAccessToken();
  if (!token) {
    return { persisted: false, backend: "in-memory-fallback" };
  }
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents/wet_lab/${encodeURIComponent(docId)}`;
  const body = {
    fields: {
      json: { stringValue: JSON.stringify(payload) },
      updatedAt: { timestampValue: new Date().toISOString() },
    },
  };
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`Firestore save failed with HTTP ${res.status}`);
  }
  return { persisted: true, backend: "firestore" };
}

export async function loadWetLabSnapshot<T>(docId: string): Promise<T | null> {
  if (!isFirestoreEnabled()) return null;
  const project = process.env.GOOGLE_CLOUD_PROJECT!;
  const token = await getAccessToken();
  if (!token) return null;
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents/wet_lab/${encodeURIComponent(docId)}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const doc = (await res.json()) as { fields?: { json?: { stringValue?: string } } };
    const raw = doc.fields?.json?.stringValue;
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
