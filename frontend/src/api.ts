import { sha256 } from "@noble/hashes/sha256";
export type School = {
  id: string;
  name: string;
  number: string;
  district?: string;
  active?: boolean;
  cases?: number;
  new?: number;
  unanswered?: number;
  officers?: number;
};
export type CaseRow = {
  id: string;
  school: string;
  school_id?: string;
  role: string | null;
  status: string;
  created_at: string;
  unanswered: boolean;
};
export type Attachment = { id: string; mime: string; size: number };
export type CaseDetail = CaseRow & {
  messages: {
    id: string;
    sender: string;
    text: string;
    created_at: string;
    attachment: Attachment | null;
  }[];
  notes?: { id: string; text: string; created_at: string }[];
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
  kind = "student",
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("X-Witness-Request", "1");
  if (kind !== "student") {
    const csrf = document.cookie
      .split("; ")
      .find((x) => x.startsWith("aw_csrf_" + kind + "="))
      ?.split("=")[1];
    if (csrf) headers.set("X-CSRF-Token", decodeURIComponent(csrf));
  }
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  )
    headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      ...options,
      headers,
      credentials: kind === "student" ? "omit" : "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new Error("Connection unavailable. Please try again.");
  }
  if (!response.ok) {
    const data = await response
      .json()
      .catch(() => ({ detail: "Request failed" }));
    throw new ApiError(
      response.status,
      typeof data.detail === "string"
        ? data.detail
        : "Please check the form fields",
    );
  }
  return response.json();
}
export function caseHeaders(code: string) {
  return { "X-Case-Code": code };
}
export async function proof(challenge: string) {
  const encoder = new TextEncoder();
  for (let n = 0; n < 10000000; n++) {
    const hash = sha256(encoder.encode(challenge + ":" + n));
    if (hash[0] === 0 && hash[1] === 0) return String(n);
    if (n % 2000 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Please refresh the form and try again");
}
export function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function downloadAttachment(
  file: Attachment,
  kind: string,
  code = "",
) {
  const response = await fetch(
    `/api/${kind === "student" ? "student" : "officer"}/attachments/${file.id}`,
    {
      credentials: kind === "student" ? "omit" : "same-origin",
      cache: "no-store",
      headers: kind === "student" ? caseHeaders(code) : {},
    },
  );
  if (!response.ok) throw new Error("File unavailable");
  return response.blob();
}
export function date(value: string, lang: string) {
  return new Intl.DateTimeFormat(
    lang === "kk" ? "kk-KZ" : lang === "ru" ? "ru-RU" : "en-GB",
    { timeZone: "Asia/Almaty", dateStyle: "medium", timeStyle: "short" },
  ).format(new Date(/[Z+-]\d*:?\d*$/.test(value) ? value : value + "Z"));
}
