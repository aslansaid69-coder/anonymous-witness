import React, { useState, useEffect, useContext, FormEvent } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import {
  Shield,
  ArrowUpRight,
  ArrowRight,
  LockKeyhole,
  EyeOff,
  MessageSquare,
  FileText,
  KeyRound,
  Check,
  ChevronRight,
  LayoutDashboard,
  FolderOpen,
  History,
  Settings as SettingsIcon,
  LogOut,
  Search,
  Upload,
  Copy,
  Download,
  CheckCircle2,
  MapPin,
  Clock,
  RefreshCw,
  X,
  Paperclip,
  Send,
  Globe,
  Menu,
  ShieldCheck,
  AlertCircle,
  Activity,
} from "lucide-react";
import { Locale, Lang, useT } from "./i18n";
import {
  api,
  ApiError,
  categories,
  statuses,
  transitions,
  Report,
  ReportRow,
  Evidence,
  saveFile,
  submitReport,
  fetchEvidence,
} from "./api";
import "./style.css";
function stamp(value: string, lang: string) {
  return new Intl.DateTimeFormat(
    lang === "kk" ? "kk-KZ" : lang === "ru" ? "ru-KZ" : "en-GB",
    { timeZone: "Asia/Almaty", dateStyle: "medium", timeStyle: "short" },
  ).format(
    new Date(
      value.endsWith("Z") || /[+-]\d\d:\d\d$/.test(value) ? value : value + "Z",
    ),
  );
}
const notice =
  "Demonstration only. Not connected to police or government systems. Do not submit real incidents or personal data.";
function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-icon">
        <Shield size={23} />
      </span>
      <span>
        ANONYMOUS<span className="brand-second">WITNESS</span>
      </span>
    </Link>
  );
}
function Language() {
  const { lang, setLang } = useContext(Locale);
  return (
    <label className="language">
      <Globe size={15} />
      <span className="sr-only">Language</span>
      <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
        <option value="en">EN</option>
        <option value="kk">ҚАЗ</option>
        <option value="ru">РУС</option>
      </select>
    </label>
  );
}
function Header() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <header className="header">
      <div className="container header-inner">
        <Brand />
        <button
          className="mobile-toggle"
          aria-label="Menu"
          onClick={() => setOpen(!open)}
        >
          <Menu />
        </button>
        <nav
          className={open ? "nav open" : "nav"}
          onClick={() => setOpen(false)}
        >
          <NavLink to="/" end>
            {t("Home")}
          </NavLink>
          <a href="/#how">{t("How it works")}</a>
          <a href="/#privacy">{t("Privacy")}</a>
          <NavLink to="/track">{t("Check report")}</NavLink>
        </nav>
        <div className="header-actions">
          <Language />
          <Link className="officer-link" to="/officer/login">
            {t("Officer portal")}
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </header>
  );
}
function Footer() {
  const t = useT();
  return (
    <footer>
      <div className="container">
        <div className="footer-top">
          <div>
            <Brand />
            <p>{t("A voice for a safer community.")}</p>
          </div>
          <div className="footer-links">
            <Link to="/report">{t("Submit a report")}</Link>
            <Link to="/track">{t("Check report")}</Link>
            <Link to="/officer/login">{t("Officer portal")}</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            {t("Created by Aslan Saidakhmet, Davlatbek, Dinmukhamed")}
          </span>
          <span>{t("University project · Kazakhstan")}</span>
        </div>
      </div>
    </footer>
  );
}
function ErrorBox({ error }: { error: string }) {
  const t = useT();
  return error ? (
    <div className="error" role="alert">
      <AlertCircle size={18} />
      {t(error)}
    </div>
  ) : null;
}
function Status({ value }: { value: string }) {
  const t = useT();
  return (
    <span className={"status status-" + statuses.indexOf(value)}>
      <i />
      {t(value)}
    </span>
  );
}
function PrivacyNotice() {
  const t = useT();
  return (
    <div className="privacy-notice">
      <ShieldCheck size={20} />
      <div>
        <strong>{t("Privacy notice")}</strong>
        <p>
          {t(
            "We do not ask for your name, email, phone number, or an account.",
          )}{" "}
          {t(
            "Technical metadata such as IP addresses may be processed by infrastructure. Attachments can contain identifying metadata. Remove personal details before uploading.",
          )}
        </p>
      </div>
    </div>
  );
}
function Home() {
  const t = useT();
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">
              <span />
              {t("For a safer Kazakhstan")}
            </div>
            <h1>
              {t("Your voice matters.")}
              <br />
              <span>{t("Your identity stays yours.")}</span>
            </h1>
            <p className="hero-desc">
              {t(
                "Share what you know. Help make your community safer, without sharing who you are.",
              )}
            </p>
            <div className="hero-buttons">
              <Link to="/report" className="btn primary">
                {t("Submit Anonymous Report")}
                <ArrowUpRight size={18} />
              </Link>
              <Link to="/track" className="text-link">
                {t("Track an existing report")}
                <ArrowRight size={16} />
              </Link>
            </div>
            <div className="hero-trust">
              <span>
                <Check size={15} />
                {t("No registration")}
              </span>
              <span>
                <Check size={15} />
                {t("Encrypted reports")}
              </span>
              <span>
                <Check size={15} />
                {t("Anonymous dialogue")}
              </span>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="orb orb-one" />
            <div className="orb orb-two" />
            <div className="visual-grid" />
            <div className="shield-halo">
              <div className="shield-art">
                <Shield size={100} strokeWidth={1} />
                <LockKeyhole size={33} className="shield-lock" />
              </div>
            </div>
            <div className="float-card float-top">
              <span className="mini-icon">
                <EyeOff size={20} />
              </span>
              <div>
                <strong>{t("No identity required")}</strong>
                <small>{t("No registration")}</small>
              </div>
              <span className="green-dot" />
            </div>
            <div className="float-card float-bottom">
              <span className="mini-icon">
                <LockKeyhole size={20} />
              </span>
              <div>
                <strong>{t("Encrypted at rest")}</strong>
                <small>AES-256-GCM</small>
              </div>
              <ShieldCheck size={19} className="text-teal" />
            </div>
            <span className="visual-caption">
              <span className="green-dot" />
              {t("Private access key")}
            </span>
          </div>
        </div>
      </section>
      <div className="demo-strip">
        <div className="container">
          <AlertCircle size={16} />
          <span>{t(notice)}</span>
        </div>
      </div>
      <section id="how" className="section container">
        <div className="section-heading">
          <div>
            <div className="eyebrow">01 / {t("How it works")}</div>
            <h2>{t("A small step. A safer community.")}</h2>
          </div>
          <p>{t("Three steps. Your identity stays private.")}</p>
        </div>
        <div className="steps">
          {[
            [
              FileText,
              "01",
              "Report in confidence",
              "Describe the incident and add any supporting evidence. No account or contact details needed.",
            ],
            [
              KeyRound,
              "02",
              "Keep your access key",
              "Save your report ID and secret token. They are the only way to return to your report.",
            ],
            [
              MessageSquare,
              "03",
              "Stay in the conversation",
              "Follow progress and answer questions through your private report inbox.",
            ],
          ].map(([Icon, n, title, desc]: any) => (
            <article className="step" key={n}>
              <div className="step-top">
                <span className="feature-icon">
                  <Icon size={24} />
                </span>
                <span className="step-number">{n}</span>
              </div>
              <h3>{t(title)}</h3>
              <p>{t(desc)}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="privacy" className="privacy-section">
        <div className="container privacy-grid">
          <div>
            <div className="eyebrow">02 / {t("Privacy")}</div>
            <h2>{t("Built around your privacy")}</h2>
            <div className="privacy-emblem">
              <ShieldCheck size={82} strokeWidth={1} />
              <span>ANONYMOUS BY DESIGN</span>
            </div>
          </div>
          <div className="privacy-points">
            {[
              [
                EyeOff,
                "You choose what to share",
                "We do not ask for your name, email, phone number, or an account.",
              ],
              [
                LockKeyhole,
                "Sensitive content is encrypted",
                "Report text, location, messages, and evidence are encrypted at rest using AES-256-GCM.",
              ],
              [
                AlertCircle,
                "Understand the limits",
                "Technical metadata such as IP addresses may be processed by infrastructure. Attachments can contain identifying metadata. Remove personal details before uploading.",
              ],
            ].map(([Icon, title, desc]: any) => (
              <div key={title}>
                <Icon size={22} />
                <div>
                  <h3>{t(title)}</h3>
                  <p>{t(desc)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container cta">
        <div>
          <div className="eyebrow">{t("For a safer Kazakhstan")}</div>
          <h2>{t("Today, you can make a difference.")}</h2>
          <p>{t("A more informed community is a safer community.")}</p>
        </div>
        <Link to="/report" className="btn primary">
          {t("Submit Anonymous Report")}
          <ArrowUpRight size={18} />
        </Link>
      </section>
    </>
  );
}
type Credentials = { report_number: string; token: string };
function Submit() {
  const t = useT();
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = new FormData(e.currentTarget);
      data.delete("files");
      files.forEach((f) => data.append("files", f));
      const creds = await submitReport<Credentials>(data);
      navigate("/confirmation", { state: creds });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="container form-page">
      <div className="page-intro">
        <div className="eyebrow">
          <LockKeyhole size={14} />
          {t("Confidential reporting")}
        </div>
        <h1>{t("Tell us what happened")}</h1>
        <p>
          {t("Use fictional information for this university demonstration.")}
        </p>
      </div>
      <div className="form-layout">
        <form className="panel report-form" onSubmit={submit}>
          <ErrorBox error={error} />
          <label>
            {t("Incident category")}
            <select name="category" required defaultValue="">
              <option value="" disabled>
                {t("Select a category")}
              </option>
              {categories.map((c) => (
                <option value={c} key={c}>
                  {t(c)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("Incident description")}
            <textarea
              name="description"
              required
              minLength={20}
              maxLength={10000}
              rows={6}
              placeholder={t(
                "Describe what you observed, including useful details. Avoid personal information.",
              )}
            />
          </label>
          <div className="two-col">
            <label>
              {t("Approximate date")}
              <input
                type="date"
                name="incident_date"
                required
                max={new Intl.DateTimeFormat("en-CA", {
                  timeZone: "Asia/Almaty",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }).format(new Date())}
              />
            </label>
            <label>
              {t("Approximate time")}
              <input type="time" name="incident_time" required />
            </label>
          </div>
          <label>
            {t("Incident location")}
            <input
              name="location"
              minLength={3}
              maxLength={500}
              required
              placeholder={t("City, district, street or landmark")}
            />
          </label>
          <div>
            <div className="field-label">
              {t("Supporting evidence")}{" "}
              <span className="muted">· {t("Optional")}</span>
            </div>
            <label className="upload-zone">
              <Upload size={24} />
              <strong>{t("Choose files")}</strong>
              <span>
                {t("Up to 5 files · 10 MB each · JPG, PNG, PDF, MP4, WebM")}
              </span>
              <input
                type="file"
                name="files"
                multiple
                accept=".jpg,.jpeg,.png,.pdf,.mp4,.webm"
                onChange={(e) => {
                  const list = Array.from(e.target.files || []);
                  if (
                    list.length > 5 ||
                    list.some(
                      (f) =>
                        f.size > 10 * 1024 * 1024 ||
                        !/\.(jpg|jpeg|png|pdf|mp4|webm)$/i.test(f.name),
                    )
                  ) {
                    setError(
                      "Please select at most 5 supported files, each no larger than 10 MB.",
                    );
                    e.target.value = "";
                    return;
                  }
                  setFiles(list);
                  setError("");
                }}
              />
            </label>
            <div className="file-list">
              {files.map((f, i) => (
                <div key={i}>
                  <Paperclip size={15} />
                  <span>{f.name}</span>
                  <small>{(f.size / 1024).toFixed(0)} KB</small>
                  <button
                    type="button"
                    aria-label={t("Close")}
                    onClick={() => setFiles(files.filter((_, j) => i !== j))}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <PrivacyNotice />
          <label className="checkbox">
            <input type="checkbox" required />
            {t(
              "I understand this is a demonstration and have read the privacy notice.",
            )}
          </label>
          <button className="btn primary full" disabled={busy}>
            {busy ? t("Submitting…") : t("Submit securely")}
            <ArrowRight size={17} />
          </button>
        </form>
        <aside className="form-aside">
          <span className="feature-icon">
            <ShieldCheck size={27} />
          </span>
          <h3>{t("Your identity stays yours.")}</h3>
          {["No registration", "Encrypted reports", "Anonymous dialogue"].map(
            (x) => (
              <p key={x}>
                <Check size={17} />
                {t(x)}
              </p>
            ),
          )}
          <hr />
          <p className="aside-note">{t(notice)}</p>
        </aside>
      </div>
    </main>
  );
}
function Confirmation() {
  const t = useT();
  const nav = useNavigate();
  const location = useLocation();
  const [creds] = useState<Credentials | null>(
    () => location.state as Credentials,
  );
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    window.history.replaceState({ ...window.history.state, usr: null }, "");
  }, []);
  if (!creds) return <Navigate to="/track" replace />;
  const text = `Anonymous Witness\nReport ID: ${creds.report_number}\nSecret access token: ${creds.token}\nKeep private. Lost access tokens cannot be recovered.`;
  return (
    <main className="narrow page">
      <div className="success-icon">
        <CheckCircle2 size={32} />
      </div>
      <h1>{t("Your report has been submitted")}</h1>
      <p>{t("Save these credentials now. They are shown only once.")}</p>
      <div className="panel credential-panel">
        <label>
          {t("Report ID")}
          <code>{creds.report_number}</code>
        </label>
        <label>
          {t("Secret access token")}
          <code>{creds.token}</code>
        </label>
        <div className="two-col">
          <button
            className="btn secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
              } catch {
                setError("Request failed");
              }
            }}
          >
            <Copy size={16} />
            {t(copied ? "Copied" : "Copy credentials")}
          </button>
          <button
            className="btn secondary"
            onClick={() =>
              saveFile(
                new Blob([text], { type: "text/plain" }),
                "anonymous-witness-credentials.txt",
              )
            }
          >
            <Download size={16} />
            {t("Download credentials")}
          </button>
        </div>
      </div>
      <div className="warning">
        <KeyRound size={19} />
        {t(
          "If you lose your token, access cannot be recovered. Keep it somewhere private.",
        )}
      </div>
      <ErrorBox error={error} />
      <button
        className="btn primary full"
        onClick={async () => {
          try {
            await api(
              "/citizen/access",
              { method: "POST", body: JSON.stringify(creds) },
              "citizen",
            );
            nav("/inbox");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        {t("Open report inbox")}
        <ArrowRight size={17} />
      </button>
    </main>
  );
}
function Access({ officer = false }: { officer?: boolean }) {
  const t = useT();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(
        officer ? "/officer/login" : "/citizen/access",
        { method: "POST", body: JSON.stringify(data) },
        officer ? "officer" : "citizen",
      );
      nav(officer ? "/officer" : "/inbox");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <div className="auth-art">
        <Shield size={100} strokeWidth={1} />
        <div className="eyebrow">ANONYMOUS WITNESS</div>
        <h2>{t("Your voice matters.")}</h2>
        <p>{t(notice)}</p>
      </div>
      <div className="auth-content">
        <div className="eyebrow">
          <LockKeyhole size={15} />
          {t("Secure workspace")}
        </div>
        <h1>{t(officer ? "Officer sign in" : "Your private report inbox")}</h1>
        <p>
          {t(
            officer
              ? "Authorized demonstration personnel only."
              : "Enter the credentials you received when submitting your report.",
          )}
        </p>
        <form onSubmit={submit}>
          <ErrorBox error={error} />
          <label>
            {t(officer ? "Username" : "Report ID")}
            <input
              name={officer ? "username" : "report_number"}
              required
              autoComplete={officer ? "username" : "off"}
              maxLength={80}
              placeholder={officer ? "demo.officer" : "AW-2026-…"}
            />
          </label>
          <label>
            {t(officer ? "Password" : "Secret access token")}
            <input
              name={officer ? "password" : "token"}
              type="password"
              required
              autoComplete={officer ? "current-password" : "off"}
              maxLength={200}
            />
          </label>
          <button className="btn primary full" disabled={busy}>
            {t(
              busy
                ? officer
                  ? "Signing in…"
                  : "Accessing…"
                : officer
                  ? "Sign in"
                  : "Access report",
            )}
            <ArrowRight size={17} />
          </button>
        </form>
        <Link to={officer ? "/track" : "/report"} className="text-link">
          {t(officer ? "Check report" : "Submit a report")}
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </main>
  );
}
function EvidenceModal({
  item,
  kind,
  onClose,
}: {
  item: Evidence;
  kind: string;
  onClose: () => void;
}) {
  const t = useT();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    let active = true;
    let object = "";
    fetchEvidence(item, kind)
      .then((b) => {
        object = URL.createObjectURL(b);
        if (active) setUrl(object);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      if (object) URL.revokeObjectURL(object);
    };
  }, [item.id]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("Evidence viewer")}
      >
        <div className="modal-header">
          <div>
            <small>{t("Evidence viewer")}</small>
            <h3>{item.filename}</h3>
          </div>
          <button autoFocus aria-label={t("Close")} onClick={onClose}>
            <X />
          </button>
        </div>
        <ErrorBox error={error} />
        <div className="evidence-preview">
          {!url && !error ? (
            t("Loading…")
          ) : item.mime_type.startsWith("image/") ? (
            <img src={url} alt={item.filename} />
          ) : item.mime_type.startsWith("video/") ? (
            <video controls src={url} />
          ) : (
            <div>
              <FileText size={55} />
              <p>{t("File preview is unavailable. Download to inspect.")}</p>
            </div>
          )}
        </div>
        <div className="hash">
          <small>SHA-256</small>
          <code>{item.sha256}</code>
        </div>
        <div className="modal-actions">
          <button
            className="btn secondary"
            onClick={async () => {
              try {
                await api(
                  "/evidence/" + item.id + "/verify",
                  { method: "POST" },
                  kind,
                );
                setVerified(true);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <ShieldCheck size={17} />
            {t(verified ? "Integrity verified" : "Verify integrity")}
          </button>
          {url && (
            <a className="btn primary" href={url} download={item.filename}>
              <Download size={17} />
              {t("Download original")}
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
function ReportDetail({ officer = false }: { officer?: boolean }) {
  const t = useT();
  const nav = useNavigate();
  const location = useLocation();
  const id = location.pathname.split("/").pop();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [next, setNext] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const kind = officer ? "officer" : "citizen";
  const path = officer ? "/officer/reports/" + id : "/citizen/report";
  async function load() {
    try {
      setReport(await api<Report>(path, {}, kind));
      setError("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401)
        nav(officer ? "/officer/login" : "/track");
      else setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, [path]);
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = e.currentTarget;
    const text = new FormData(form).get("text");
    try {
      await api(
        officer ? path + "/messages?internal=" + internal : "/citizen/messages",
        { method: "POST", body: JSON.stringify({ text }) },
        kind,
      );
      form.reset();
      setNotice(internal ? "Note added" : "Message sent");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!report)
    return (
      <main className="container page">
        <ErrorBox error={error} />
        {t("Loading…")}
      </main>
    );
  return (
    <main className={officer ? "detail-page" : "container page detail-page"}>
      {officer && (
        <Link to="/officer/reports" className="text-link">
          ← {t("Back to reports")}
        </Link>
      )}
      <div className="detail-heading">
        <div>
          <div className="eyebrow">{report.report_number}</div>
          <h1>{t("Incident details")}</h1>
        </div>
        <div className="inline-actions">
          <button className="btn secondary" onClick={load}>
            <RefreshCw size={16} />
            {t("Refresh")}
          </button>
          {!officer && (
            <button
              className="btn secondary"
              onClick={async () => {
                await api("/logout/citizen", { method: "POST" }, "citizen");
                nav("/track");
              }}
            >
              {t("Sign out")}
            </button>
          )}
        </div>
      </div>
      <ErrorBox error={error} />
      {notice && (
        <div className="success" role="status">
          {t(notice)}
        </div>
      )}
      <div className="detail-grid">
        <div>
          <section className="panel">
            <div className="report-title">
              <h3>{t(report.category)}</h3>
              <Status value={report.status} />
            </div>
            <p className="report-description">{report.description}</p>
            <div className="report-meta">
              <span>
                <MapPin size={16} />
                {report.location}
              </span>
              <span>
                <Clock size={16} />
                {report.incident_date} · {report.incident_time.slice(0, 5)}
              </span>
            </div>
          </section>
          <section className="panel">
            <h3>
              {t("Supporting evidence")}{" "}
              <span className="count">{report.evidence.length}</span>
            </h3>
            {report.evidence.length ? (
              report.evidence.map((e) => (
                <button
                  key={e.id}
                  className="evidence-row"
                  onClick={() => setEvidence(e)}
                >
                  <span className="feature-icon">
                    <FileText size={20} />
                  </span>
                  <span>
                    <strong>{e.filename}</strong>
                    <small>
                      {(e.size / 1024).toFixed(1)} KB · {t("Open evidence")}
                    </small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              ))
            ) : (
              <p className="empty">{t("No evidence attached")}</p>
            )}
          </section>
          <section className="panel messages-panel">
            <div className="tabs">
              <button
                className={!internal ? "active" : ""}
                onClick={() => setInternal(false)}
              >
                {t("Messages")}
              </button>
              {officer && (
                <button
                  className={internal ? "active" : ""}
                  onClick={() => setInternal(true)}
                >
                  {t("Internal notes")}
                </button>
              )}
            </div>
            <div className="messages">
              {report.messages.filter((m) =>
                internal
                  ? m.sender_type === "internal"
                  : m.sender_type !== "internal",
              ).length ? (
                report.messages
                  .filter((m) =>
                    internal
                      ? m.sender_type === "internal"
                      : m.sender_type !== "internal",
                  )
                  .map((m) => (
                    <div
                      key={m.id}
                      className={
                        "message " +
                        (m.sender_type === (officer ? "officer" : "citizen") ||
                        m.sender_type === "internal"
                          ? "own"
                          : "")
                      }
                    >
                      <div className="message-head">
                        <strong>
                          {t(
                            m.sender_type === "citizen"
                              ? "Citizen"
                              : m.sender_type === "officer"
                                ? "Officer"
                                : "Internal",
                          )}
                        </strong>
                        <small>{stamp(m.created_at, t("__locale"))}</small>
                      </div>
                      <p>{m.text}</p>
                      <small>{t(m.read_at ? "Read" : "Sent")}</small>
                    </div>
                  ))
              ) : (
                <p className="empty">{t("No messages yet")}</p>
              )}
            </div>
            <form onSubmit={send}>
              <textarea
                name="text"
                required
                minLength={1}
                maxLength={5000}
                rows={3}
                aria-label={t("Messages")}
                placeholder={t(
                  "Write a message. Do not include identifying details.",
                )}
              />
              <button className="btn primary" disabled={busy}>
                {t(internal ? "Add internal note" : "Send message")}
                <Send size={16} />
              </button>
            </form>
          </section>
        </div>
        <aside>
          <section className="panel">
            <h3>{t("Status timeline")}</h3>
            <div className="timeline">
              {report.history.map((h, i) => (
                <div key={i}>
                  <span className="timeline-dot" />
                  <strong>{t(h.status)}</strong>
                  <small>{stamp(h.created_at, t("__locale"))}</small>
                </div>
              ))}
            </div>
          </section>
          {officer && (
            <section className="panel">
              <h3>{t("Update status")}</h3>
              <select
                value={next}
                aria-label={t("Select next status")}
                onChange={(e) => setNext(e.target.value)}
              >
                <option value="">{t("Select next status")}</option>
                {transitions[report.status].map((s) => (
                  <option value={s} key={s}>
                    {t(s)}
                  </option>
                ))}
              </select>
              <button
                className="btn primary full"
                disabled={!next || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api(path + "/status", {
                      method: "PATCH",
                      body: JSON.stringify({ status: next }),
                    });
                    setNext("");
                    setNotice("Status updated");
                    await load();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t("Save status")}
              </button>
            </section>
          )}
          {!officer && <PrivacyNotice />}
        </aside>
      </div>
      {evidence && (
        <EvidenceModal
          item={evidence}
          kind={kind}
          onClose={() => setEvidence(null)}
        />
      )}
    </main>
  );
}
function OfficerShell() {
  const t = useT();
  const nav = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<{ username: string; role: string } | null>(
    null,
  );
  const [error, setError] = useState("");
  useEffect(() => {
    api("/officer/me")
      .then(setUser)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) nav("/officer/login");
        else setError(e.message);
      });
  }, [location.pathname]);
  if (!user)
    return (
      <main className="container page">
        <ErrorBox error={error} />
        {t("Loading…")}
      </main>
    );
  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="sidebar-label">{t("Investigation workspace")}</div>
        <nav>
          {[
            [LayoutDashboard, "Overview", "/officer"],
            [FolderOpen, "All reports", "/officer/reports"],
            [History, "Activity log", "/officer/activity"],
            [SettingsIcon, "Settings", "/officer/settings"],
          ].map(([Icon, label, to]: any) => (
            <NavLink key={to} to={to} end={to === "/officer"}>
              <Icon size={18} />
              {t(label)}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-avatar">
            {user.username.slice(0, 1).toUpperCase()}
          </div>
          <strong>{user.username}</strong>
          <small>
            {t(user.role === "admin" ? "Administrator" : "Officer")}
          </small>
          <button
            onClick={async () => {
              try {
                await api("/logout/officer", { method: "POST" });
                nav("/officer/login");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <LogOut size={17} />
            {t("Sign out")}
          </button>
          <ErrorBox error={error} />
        </div>
      </aside>
      <div className="workspace-content">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:id" element={<ReportDetail officer />} />
          <Route path="activity" element={<Audit />} />
          <Route path="settings" element={<Settings role={user.role} />} />
          <Route path="*" element={<Navigate to="/officer" />} />
        </Routes>
      </div>
    </div>
  );
}
function ReportTable({ rows }: { rows: ReportRow[] }) {
  const t = useT();
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {["Report ID", "Category", "Location", "Status", "Date"].map(
              (s) => (
                <th key={s}>{t(s)}</th>
              ),
            )}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <Link className="report-id" to={"/officer/reports/" + r.id}>
                  {r.report_number}
                </Link>
              </td>
              <td>{t(r.category)}</td>
              <td>{r.location}</td>
              <td>
                <Status value={r.status} />
              </td>
              <td className="date-cell">{r.incident_date}</td>
              <td>
                <Link
                  aria-label={t("Incident details")}
                  to={"/officer/reports/" + r.id}
                >
                  <ChevronRight size={18} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <div className="empty">{t("No reports found")}</div>}
    </div>
  );
}
function Dashboard() {
  const t = useT();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    try {
      setRows(await api("/officer/reports"));
      setLoaded(true);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const counts = [
    rows.length,
    rows.filter((r) => r.status === "Submitted").length,
    rows.filter((r) =>
      [
        "Under Review",
        "In Progress",
        "Additional Information Requested",
      ].includes(r.status),
    ).length,
    rows.filter((r) => r.status === "Resolved").length,
  ];
  const cats = categories
    .map((c) => ({
      name: c,
      count: rows.filter((r) => r.category === c).length,
    }))
    .filter((c) => c.count);
  const locs = Object.entries(
    rows.reduce(
      (a, r) => {
        const city = r.location.split(",")[0].trim();
        a[city] = (a[city] || 0) + 1;
        return a;
      },
      {} as Record<string, number>,
    ),
  ).sort((a, b) => b[1] - a[1]);
  return (
    <>
      <div className="workspace-heading">
        <div>
          <div className="eyebrow">{t("Secure workspace")}</div>
          <h1>{t("Report overview")}</h1>
          <p>{t("Manage reports, review evidence, and follow up securely.")}</p>
        </div>
        <button className="btn secondary" onClick={load}>
          <RefreshCw size={16} />
          {t("Refresh")}
        </button>
      </div>
      <ErrorBox error={error} />
      <div className="stats">
        {[
          "Total reports",
          "New reports",
          "Under investigation",
          "Resolved reports",
        ].map((s, i) => (
          <div className="stat" key={s}>
            <div>
              <span>{t(s)}</span>
              {i === 0 ? (
                <FolderOpen size={18} />
              ) : i === 3 ? (
                <CheckCircle2 size={18} />
              ) : (
                <Activity size={18} />
              )}
            </div>
            <strong>{loaded ? counts[i] : "—"}</strong>
            <small>{t("Prototype environment")}</small>
          </div>
        ))}
      </div>
      <div className="chart-grid">
        <section className="panel">
          <h3>{t("Reports by category")}</h3>
          <div className="bars">
            {cats.map((c, i) => (
              <div className="bar-row" key={c.name}>
                <span>{t(c.name)}</span>
                <div>
                  <i
                    style={{
                      width:
                        (100 * c.count) /
                          Math.max(...cats.map((x) => x.count), 1) +
                        "%",
                      background: ["#1b334a", "#237b7c", "#639a93", "#9db8ae"][
                        i % 4
                      ],
                    }}
                  />
                </div>
                <strong>{c.count}</strong>
              </div>
            ))}
            {!cats.length && <p className="empty">{t("No reports yet")}</p>}
          </div>
        </section>
        <section className="panel">
          <h3>{t("Reports by location")}</h3>
          <div className="location-chart">
            {locs.map(([loc, count]) => (
              <div key={loc}>
                <span>
                  <MapPin size={16} />
                  {loc}
                </span>
                <strong>{count}</strong>
                <div>
                  <i
                    style={{
                      width: (100 * count) / Math.max(rows.length, 1) + "%",
                    }}
                  />
                </div>
              </div>
            ))}
            {!locs.length && <p className="empty">{t("No reports yet")}</p>}
          </div>
        </section>
      </div>
      <section className="panel table-panel">
        <div className="panel-heading">
          <h3>{t("Recent reports")}</h3>
          <Link to="/officer/reports" className="text-link">
            {t("View all")}
            <ArrowRight size={16} />
          </Link>
        </div>
        <ReportTable rows={rows.slice(0, 6)} />
      </section>
      <RecentActivity />
    </>
  );
}
function RecentActivity() {
  const t = useT();
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/officer/audit")
      .then(setLogs)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <section className="panel">
      <div className="panel-heading">
        <h3>{t("Activity log")}</h3>
        <Link to="/officer/activity" className="text-link">
          {t("View all")}
          <ArrowRight size={16} />
        </Link>
      </div>
      <ErrorBox error={error} />
      {logs.slice(0, 4).map((a, i) => (
        <div key={i} className="activity-row">
          <span className="activity-dot" />
          <strong>{a.username}</strong>
          <span>{a.action.replaceAll("_", " ")}</span>
          <small>{stamp(a.timestamp, t("__locale"))}</small>
        </div>
      ))}
    </section>
  );
}
function Reports() {
  const t = useT();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function load(params = "") {
    setLoading(true);
    try {
      setRows(await api("/officer/reports" + params));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  return (
    <>
      <div className="workspace-heading">
        <div>
          <div className="eyebrow">{t("Investigation workspace")}</div>
          <h1>{t("All reports")}</h1>
        </div>
        <span className="count">{rows.length}</span>
      </div>
      <ErrorBox error={error} />
      <form
        className="panel filters"
        onSubmit={(e) => {
          e.preventDefault();
          const params = new URLSearchParams();
          new FormData(e.currentTarget).forEach((v, k) => {
            if (v) params.set(k, String(v));
          });
          load("?" + params);
        }}
      >
        <label className="search-field">
          <span>{t("Search reports")}</span>
          <div>
            <Search size={17} />
            <input
              name="q"
              maxLength={200}
              placeholder={t("Search by ID, description or location")}
            />
          </div>
        </label>
        <div className="filter-grid">
          <label>
            {t("Category")}
            <select name="category">
              <option value="">{t("All categories")}</option>
              {categories.map((c) => (
                <option value={c} key={c}>
                  {t(c)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("Status")}
            <select name="status">
              <option value="">{t("All statuses")}</option>
              {statuses.map((s) => (
                <option value={s} key={s}>
                  {t(s)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("Location")}
            <input
              name="location"
              maxLength={100}
              placeholder={t("Location contains")}
            />
          </label>
          <label>
            {t("From date")}
            <input name="start" type="date" />
          </label>
          <label>
            {t("To date")}
            <input name="end" type="date" />
          </label>
        </div>
        <div className="inline-actions">
          <button className="btn primary" disabled={loading}>
            {t(loading ? "Loading…" : "Apply filters")}
          </button>
          <button type="reset" className="btn secondary" onClick={() => load()}>
            {t("Reset")}
          </button>
        </div>
      </form>
      <section className="panel table-panel">
        <ReportTable rows={rows} />
      </section>
    </>
  );
}
function Audit() {
  const t = useT();
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState("");
  async function load() {
    try {
      setLogs(await api("/officer/audit"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  return (
    <>
      <div className="workspace-heading">
        <div>
          <h1>{t("Activity log")}</h1>
          <p>{t("Refresh to see the latest activity.")}</p>
        </div>
        <button className="btn secondary" onClick={load}>
          <RefreshCw size={16} />
          {t("Refresh")}
        </button>
      </div>
      <ErrorBox error={error} />
      <div className="panel table-panel table-wrap">
        <table>
          <thead>
            <tr>
              {["Officer", "Action", "Report ID", "Time"].map((x) => (
                <th key={x}>{t(x)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={i}>
                <td>{l.username}</td>
                <td>{l.action.replaceAll("_", " ")}</td>
                <td>
                  {l.report_id ? (
                    <Link to={"/officer/reports/" + l.report_id}>
                      {l.report_id.slice(0, 8)}
                      <ArrowUpRight size={13} />
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{stamp(l.timestamp, t("__locale"))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!logs.length && <div className="empty">{t("No activity yet")}</div>}
      </div>
    </>
  );
}
function Settings({ role }: { role: string }) {
  const t = useT();
  const nav = useNavigate();
  const [config, setConfig] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (role === "admin")
      api("/admin/settings")
        .then(setConfig)
        .catch((e) => setError(e.message));
  }, [role]);
  return (
    <>
      <div className="workspace-heading">
        <div>
          <h1>{t("Settings")}</h1>
          <p>{t("Security and session settings")}</p>
        </div>
      </div>
      <ErrorBox error={error} />
      <div className="chart-grid">
        <section className="panel">
          <h3>{t("Change password")}</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api("/officer/password", {
                  method: "POST",
                  body: JSON.stringify(
                    Object.fromEntries(new FormData(e.currentTarget)),
                  ),
                });
                nav("/officer/login");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              {t("Current password")}
              <input
                name="current_password"
                type="password"
                required
                maxLength={200}
                autoComplete="current-password"
              />
            </label>
            <label>
              {t("New password")}
              <input
                name="new_password"
                type="password"
                required
                minLength={12}
                maxLength={200}
                autoComplete="new-password"
                placeholder={t("At least 12 characters")}
              />
            </label>
            <button className="btn primary" disabled={busy}>
              {t("Change password")}
            </button>
          </form>
        </section>
        <section className="panel">
          <h3>{t("System configuration")}</h3>
          {role !== "admin" ? (
            <p>{t("Access is restricted to administrators.")}</p>
          ) : !config ? (
            <p>{t("Loading…")}</p>
          ) : (
            <dl className="config">
              {[
                ["Environment", t("University demonstration")],
                ["Encryption", config.encryption],
                ["Maximum file size", config.max_file_mb + " MB"],
                ["Session minutes", config.session_minutes],
                [
                  "Secure cookies",
                  t(config.secure_cookies ? "On" : "Off (local HTTP demo)"),
                ],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{t(k)}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>
    </>
  );
}
function Scroll() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash)
      setTimeout(
        () =>
          document
            .getElementById(hash.slice(1))
            ?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}
function App() {
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("aw_language") as Lang) || "en",
  );
  useEffect(() => {
    localStorage.setItem("aw_language", lang);
    document.documentElement.lang = lang;
  }, [lang]);
  return (
    <Locale.Provider value={{ lang, setLang }}>
      <BrowserRouter>
        <Scroll />
        <div className="prototype-banner">
          <span />
          <span>
            {lang === "en"
              ? "INDEPENDENT UNIVERSITY PROTOTYPE"
              : lang === "ru"
                ? "НЕЗАВИСИМЫЙ УНИВЕРСИТЕТСКИЙ ПРОТОТИП"
                : "ТӘУЕЛСІЗ УНИВЕРСИТЕТТІК ПРОТОТИП"}
          </span>
          <span className="banner-country">KAZAKHSTAN</span>
        </div>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<Submit />} />
          <Route path="/confirmation" element={<Confirmation />} />
          <Route path="/track" element={<Access />} />
          <Route path="/inbox" element={<ReportDetail />} />
          <Route path="/officer/login" element={<Access officer />} />
          <Route path="/officer/*" element={<OfficerShell />} />
          <Route
            path="*"
            element={
              <main className="container page">
                <h1>404</h1>
                <Link to="/">Home</Link>
              </main>
            }
          />
        </Routes>
        <Footer />
      </BrowserRouter>
    </Locale.Provider>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
