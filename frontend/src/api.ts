export const categories = [
  "Theft",
  "Fraud",
  "Violence",
  "Corruption",
  "Cybercrime",
  "Drug-related activity",
  "Suspicious activity",
  "Other",
];
export const statuses = [
  "Submitted",
  "Under Review",
  "Additional Information Requested",
  "In Progress",
  "Resolved",
  "Rejected",
];
export const transitions: Record<string, string[]> = {
  Submitted: ["Under Review", "Rejected"],
  "Under Review": [
    "Additional Information Requested",
    "In Progress",
    "Resolved",
    "Rejected",
  ],
  "Additional Information Requested": [
    "Under Review",
    "In Progress",
    "Resolved",
    "Rejected",
  ],
  "In Progress": ["Additional Information Requested", "Resolved", "Rejected"],
  Resolved: ["Under Review"],
  Rejected: ["Under Review"],
};
export type Evidence = {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
  sha256: string;
};
export type ReportRow = {
  id: string;
  report_number: string;
  category: string;
  location: string;
  status: string;
  incident_date: string;
  created_at: string;
};
export type Report = ReportRow & {
  description: string;
  incident_time: string;
  evidence: Evidence[];
  messages: {
    id: string;
    sender_type: string;
    text: string;
    created_at: string;
    read_at: string | null;
  }[];
  history: { status: string; created_at: string }[];
};
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
  kind = "officer",
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("X-Witness-Request", "1");
  headers.set("X-Witness-Role", kind);
  const csrf = document.cookie
    .split("; ")
    .find((v) => v.startsWith("aw_csrf_" + kind + "="))
    ?.split("=")[1];
  if (csrf) headers.set("X-CSRF-Token", decodeURIComponent(csrf));
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  )
    headers.set("Content-Type", "application/json");
  let res: Response;
  try {
    res = await fetch("/api" + path, {
      ...options,
      headers,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new Error("Could not reach the server. Please try again.");
  }
  if (!res.ok) {
    let data;
    try {
      data = await res.json();
    } catch {
      data = { detail: "Request failed" };
    }
    throw new ApiError(
      res.status,
      typeof data.detail === "string"
        ? data.detail
        : "Please check the form fields.",
    );
  }
  return res.json();
}
export function saveFile(content: Blob, name: string) {
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Keep each request below serverless gateway limits while preserving 10 MiB evidence.
export async function submitReport<T>(data: FormData): Promise<T> {
  const files = data
    .getAll("files")
    .filter((v): v is File => v instanceof File);
  if (files.reduce((sum, f) => sum + f.size, 0) < 3 * 1024 * 1024) {
    return api<T>("/reports", { method: "POST", body: data }, "citizen");
  }
  const encoded = new Response(data);
  const payload = await encoded.blob();
  const upload = await api<{ id: string; token: string; chunk_bytes: number }>(
    "/submissions",
    {
      method: "POST",
      body: JSON.stringify({
        content_type: encoded.headers.get("Content-Type"),
        total_bytes: payload.size,
      }),
    },
    "citizen",
  );
  const headers = {
    "X-Upload-Token": upload.token,
    "Content-Type": "application/octet-stream",
  };
  for (
    let start = 0, position = 0;
    start < payload.size;
    start += upload.chunk_bytes, position++
  ) {
    await api(
      `/submissions/${upload.id}/chunks/${position}`,
      {
        method: "PUT",
        headers,
        body: payload.slice(start, start + upload.chunk_bytes),
      },
      "citizen",
    );
  }
  return api<T>(
    `/submissions/${upload.id}/complete`,
    { method: "POST", headers: { "X-Upload-Token": upload.token } },
    "citizen",
  );
}

export async function fetchEvidence(
  item: Evidence,
  kind: string,
): Promise<Blob> {
  const chunks: Blob[] = [];
  for (
    let offset = 0, position = 0;
    offset < item.size;
    offset += 512 * 1024, position++
  ) {
    const response = await fetch(
      `/api/evidence/${item.id}/chunks/${position}`,
      {
        credentials: "same-origin",
        cache: "no-store",
        headers: { "X-Witness-Role": kind },
      },
    );
    if (!response.ok) throw new ApiError(response.status, "Request failed");
    chunks.push(await response.blob());
  }
  return new Blob(chunks, { type: item.mime_type });
}
