import React, {
  useState,
  useRef,
  useEffect,
  useContext,
  createContext,
  FormEvent,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import {
  Shield,
  ArrowRight,
  ArrowUpRight,
  LockKeyhole,
  EyeOff,
  MessageSquare,
  Check,
  ChevronDown,
  Search,
  KeyRound,
  Copy,
  Download,
  Sun,
  Moon,
  LogOut,
  Plus,
  Settings,
  School as SchoolIcon,
  Users,
  History,
  FileText,
  Bell,
  X,
  RefreshCw,
  Send,
} from "lucide-react";
import { Locale, Lang, useT } from "./i18n";
import {
  api,
  ApiError,
  School,
  CaseRow,
  CaseDetail,
  Attachment,
  caseHeaders,
  proof,
  saveFile,
  downloadAttachment,
  date,
} from "./api";
import "./school.css";
const StudentContext = createContext<{
  school: School | null;
  setSchool: (s: School | null) => void;
  code: string;
  setCode: (c: string) => void;
}>({ school: null, setSchool: () => {}, code: "", setCode: () => {} });
function ErrorBox({ error }: { error: string }) {
  const t = useT();
  return error ? (
    <p role="alert" className="error">
      {t(error)}
    </p>
  ) : null;
}
function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-icon">
        <Shield />
      </span>
      <span>
        ANONYMOUS<span className="brand-sub">WITNESS</span>
      </span>
    </Link>
  );
}
function Header() {
  const t = useT();
  const { lang, setLang } = useContext(Locale);
  const [dark, setDark] = useState(
    () =>
      localStorage.getItem("school_theme") === "dark" ||
      (!localStorage.getItem("school_theme") &&
        matchMedia("(prefers-color-scheme: dark)").matches),
  );
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("school_theme", dark ? "dark" : "light");
  }, [dark]);
  return (
    <>
      <div className="topbar">{t("School Edition")}</div>
      <header className="header">
        <div className="container header-inner">
          <Brand />
          <div className="header-tools">
            <label className="sr-only" htmlFor="language">
              Language
            </label>
            <select
              id="language"
              className="language"
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
            >
              <option value="en">English</option>
              <option value="ru">Русский</option>
              <option value="kk">Қазақша</option>
            </select>
            <button
              className="icon-button"
              aria-label="Theme"
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun /> : <Moon />}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
function Emergency() {
  const t = useT();
  return (
    <aside className="emergency" role="note">
      <div className="container">
        <a href="tel:112" className="emergency-number">
          112 <ArrowUpRight size={16} />
        </a>
        <span>
          {t(
            "If someone is in immediate danger, call 112 now. This website is not monitored 24/7.",
          )}
        </span>
      </div>
    </aside>
  );
}
function Footer() {
  const t = useT();
  return (
    <footer>
      <div className="container">
        <div className="footer-top">
          <Brand />
          <nav>
            <Link to="/privacy">{t("Privacy")}</Link>
            <Link to="/officer/login">{t("Staff sign in")}</Link>
          </nav>
        </div>
        <p>{t("Created by Aslan Saidakhmet, Davlatbek, Dinmukhamed")}</p>
      </div>
    </footer>
  );
}
function SchoolPicker() {
  const t = useT();
  const { school, setSchool } = useContext(StudentContext);
  const [schools, setSchools] = useState<School[]>([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    api<School[]>("/schools")
      .then(setSchools)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <div className="school-picker">
      <label>{t("Select your school")}</label>
      <button
        className="select-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <SchoolIcon size={20} />
        <span>{school?.name || t("Select your school")}</span>
        <ChevronDown size={18} />
      </button>
      {open && (
        <div className="school-menu">
          <label className="search-input">
            <Search size={18} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("Search schools")}
              aria-label={t("Search schools")}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
            />
          </label>
          <div role="listbox" aria-label={t("Select your school")}>
            {schools
              .filter((s) =>
                (s.name + " " + s.number)
                  .toLowerCase()
                  .includes(q.toLowerCase()),
              )
              .map((s) => (
                <button
                  key={s.id}
                  role="option"
                  aria-selected={school?.id === s.id}
                  onClick={() => {
                    setSchool(s);
                    setOpen(false);
                  }}
                >
                  {s.name}
                  {school?.id === s.id && <Check size={18} />}
                </button>
              ))}
            {!schools.filter((s) =>
              (s.name + " " + s.number).toLowerCase().includes(q.toLowerCase()),
            ).length && <p>{t("No matching schools")}</p>}
          </div>
        </div>
      )}
      <ErrorBox error={error} />
      {!schools.length && !error && (
        <p className="hint">
          {t(
            "Your school is not listed yet? Ask a trusted adult to contact your school.",
          )}
        </p>
      )}
    </div>
  );
}
function Home() {
  const t = useT();
  const { school } = useContext(StudentContext);
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">{t("School Edition")}</span>
            <h1>{t("A safer school starts with a voice.")}</h1>
            <p className="lead">
              {t("Your message is anonymous. Nobody will ask who you are.")}
            </p>
            <p>
              {t(
                "If something feels wrong, you can speak up. Tell your school police officer about bullying, threats, violence or something you witnessed.",
              )}
            </p>
            <div className="home-form">
              <SchoolPicker />
              {school ? (
                <Link to="/write" className="btn primary full">
                  {t("Write a message")}
                  <ArrowRight size={18} />
                </Link>
              ) : (
                <button className="btn primary full" disabled>
                  {t("Write a message")}
                  <ArrowRight size={18} />
                </button>
              )}
              <Link to="/case" className="btn secondary full">
                {t("Check my case")}
                <KeyRound size={18} />
              </Link>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="halo">
              <Shield size={120} strokeWidth={1} />
              <LockKeyhole className="halo-lock" size={36} />
            </div>
            <div className="float-card">
              <EyeOff />
              <span>{t("No account needed")}</span>
              <span className="green-dot" />
            </div>
            <div className="visual-note">
              <MessageSquare />
              <span>{t("Only your school’s assigned officers")}</span>
            </div>
          </div>
        </div>
      </section>
      <section className="container section">
        <div className="feature-grid">
          {[
            [EyeOff, "No account needed"],
            [SchoolIcon, "Only your school’s assigned officers"],
            [KeyRound, "Keep your Case Code"],
          ].map(([Icon, label]: any) => (
            <div className="feature" key={label}>
              <Icon size={25} />
              <h3>{t(label)}</h3>
            </div>
          ))}
        </div>
        <div className="how">
          <h2>{t("How it works")}</h2>
          <p>
            {t(
              "Choose your school, write what happened, and save your private Case Code. Return with that code to read replies and continue the conversation.",
            )}
          </p>
        </div>
      </section>
    </>
  );
}
function AttachmentField() {
  const t = useT();
  return (
    <label>
      {t("Optional attachment")}
      <input
        name="attachment"
        type="file"
        accept="image/jpeg,image/png,application/pdf"
      />
      <small>
        {t(
          "JPG, PNG or PDF · up to 3 MB · PDFs up to 12 pages. Original file metadata is removed.",
        )}
      </small>
    </label>
  );
}
function Write() {
  const t = useT();
  const nav = useNavigate();
  const { school, setCode } = useContext(StudentContext);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!school) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData(e.currentTarget);
      form.set("school_id", school.id);
      const file = form.get("attachment");
      if (file instanceof File && !file.size) form.delete("attachment");
      if (file instanceof File && file.size > 3 * 1024 * 1024)
        throw new Error("File must be 3 MB or less");
      const config = await api("/public/config");
      form.set("challenge_token", config.challenge);
      form.set("proof", await proof(config.challenge));
      const result = await api("/cases", { method: "POST", body: form });
      setCode(result.case_code);
      nav("/saved");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="narrow page">
      <Link to="/" className="back">
        ← {t("Back")}
      </Link>
      <span className="eyebrow">{t("School Edition")}</span>
      <h1>{t("Tell us what happened")}</h1>
      <p>
        {t(
          "You can share as much as you feel comfortable sharing. Avoid details that identify you, including faces in photos.",
        )}
      </p>
      <form className="panel form-stack" onSubmit={submit}>
        <SchoolPicker />
        <label>
          {t("Your message")}
          <textarea
            name="text"
            required
            minLength={5}
            maxLength={10000}
            rows={6}
          />
        </label>
        <label>
          {t("I am… (optional)")}
          <select name="role" defaultValue="">
            <option value="">{t("Prefer not to say")}</option>
            <option value="victim">{t("A victim")}</option>
            <option value="witness">{t("A witness")}</option>
          </select>
        </label>
        <AttachmentField />
        <label className="honeypot" aria-hidden="true">
          Website
          <input name="website" autoComplete="off" tabIndex={-1} />
        </label>
        <ErrorBox error={error} />
        <button className="btn primary full" disabled={busy || !school}>
          {t(busy ? "Sending…" : "Send anonymously")}
          <ArrowRight size={18} />
        </button>
        <Link to="/privacy" className="subtle-link">
          {t("Privacy")}
        </Link>
      </form>
    </main>
  );
}
function Saved() {
  const t = useT();
  const { code } = useContext(StudentContext);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  if (!code) return <Navigate to="/case" replace />;
  return (
    <main className="narrow page center">
      <span className="success-icon">
        <Check size={32} />
      </span>
      <h1>{t("Save this code")}</h1>
      <p>
        {t(
          "Your message was sent. This Case Code is the only way to return. We cannot recover it if you lose it.",
        )}
      </p>
      <div className="panel">
        <label>
          {t("Case Code")}
          <code className="case-code">{code}</code>
        </label>
        <div className="two-col">
          <button
            className="btn secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setCopied(true);
              } catch {
                setError("Request failed");
              }
            }}
          >
            <Copy size={18} />
            {t(copied ? "Copied" : "Copy code")}
          </button>
          <button
            className="btn secondary"
            onClick={() =>
              saveFile(
                new Blob(
                  [
                    "Case Code: " +
                      code +
                      "\nhttps://anonymous-witness.vercel.app/case\nKeep this code private.",
                  ],
                  { type: "text/plain" },
                ),
                "my-case-code.txt",
              )
            }
          >
            <Download size={18} />
            {t("Download code")}
          </button>
        </div>
      </div>
      <ErrorBox error={error} />
      <Link to="/case" className="btn primary full">
        {t("Open my case")}
        <ArrowRight size={18} />
      </Link>
    </main>
  );
}
function FileView({
  item,
  kind,
  code,
  onClose,
}: {
  item: Attachment;
  kind: string;
  code: string;
  onClose: () => void;
}) {
  const t = useT();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let object = "";
    downloadAttachment(item, kind, code)
      .then((b) => {
        object = URL.createObjectURL(b);
        if (active) setUrl(object);
      })
      .catch((e) => setError(e.message));
    return () => {
      active = false;
      if (object) URL.revokeObjectURL(object);
    };
  }, [item.id, kind, code]);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onClose]);
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("Attachment")}
      >
        <div className="row between">
          <h2>{t("Attachment")}</h2>
          <button
            autoFocus
            className="icon-button"
            aria-label={t("Close")}
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <ErrorBox error={error} />
        {url && item.mime === "image/jpeg" && (
          <img className="attachment-image" src={url} alt={t("Attachment")} />
        )}
        <p>
          {t(
            "Original names, EXIF and GPS are not saved. Photos are re-encoded and PDF pages are converted to clean images. Visible personal information is not automatically hidden.",
          )}
        </p>
        {url ? (
          <a
            className="btn primary"
            href={url}
            download={
              "attachment." + (item.mime === "application/pdf" ? "pdf" : "jpg")
            }
          >
            {t("Download")}
            <Download size={18} />
          </a>
        ) : (
          !error && <p>{t("Loading…")}</p>
        )}
      </section>
    </div>
  );
}
function Conversation({
  value,
  kind,
  code = "",
  refresh,
}: {
  value: CaseDetail;
  kind: string;
  code?: string;
  refresh: () => Promise<void>;
}) {
  const t = useT();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<Attachment | null>(null);
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = e.currentTarget;
    try {
      const data = new FormData(form);
      if (kind === "student") {
        const attachment = data.get("attachment");
        if (attachment instanceof File && !attachment.size)
          data.delete("attachment");
        if (attachment instanceof File && attachment.size > 3 * 1024 * 1024)
          throw new Error("File must be 3 MB or less");
        await api("/student/messages", {
          method: "POST",
          body: data,
          headers: caseHeaders(code),
        });
      } else
        await api(
          `/officer/cases/${value.id}/messages`,
          { method: "POST", body: JSON.stringify({ text: data.get("text") }) },
          "officer",
        );
      form.reset();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="conversation-messages" aria-live="polite">
        {value.messages.map((m) => (
          <article
            key={m.id}
            className={
              "bubble " +
              (m.sender === (kind === "student" ? "student" : "officer")
                ? "own"
                : "")
            }
          >
            <div className="bubble-head">
              <strong>
                {t(
                  m.sender === "student"
                    ? "Anonymous student"
                    : "School police officer",
                )}
              </strong>
              <time>{date(m.created_at, t("__locale"))}</time>
            </div>
            <p>{m.text}</p>
            {m.attachment && (
              <button
                className="attachment-link"
                onClick={() => setFile(m.attachment)}
              >
                <FileText size={18} />
                {t("Open attachment")}
              </button>
            )}
          </article>
        ))}
      </div>
      <ErrorBox error={error} />
      {value.status === "Closed" ? (
        <p className="closed-notice">{t("This case is closed")}</p>
      ) : (
        <form className="composer form-stack" onSubmit={send}>
          <label className="sr-only" htmlFor="reply">
            {t("Type your message")}
          </label>
          <textarea
            id="reply"
            name="text"
            required
            maxLength={10000}
            rows={3}
            placeholder={t("Type your message")}
          />
          {kind === "student" && <AttachmentField />}
          <button className="btn primary" disabled={busy}>
            {t(busy ? "Sending…" : "Send reply")}
            <Send size={18} />
          </button>
        </form>
      )}
      {file && (
        <FileView
          item={file}
          kind={kind}
          code={code}
          onClose={() => setFile(null)}
        />
      )}
    </>
  );
}
function StudentCase() {
  const t = useT();
  const { code, setCode } = useContext(StudentContext);
  const [value, setValue] = useState<CaseDetail | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const currentCode = useRef(code);
  currentCode.current = code;
  async function refresh() {
    if (!code) return;
    try {
      const result = await api<CaseDetail>("/student/case", {
        headers: caseHeaders(code),
      });
      if (currentCode.current !== code) return;
      setValue(result);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    setValue(null);
    refresh();
    const id = setInterval(() => {
      if (!document.hidden) refresh();
    }, 12000);
    return () => clearInterval(id);
  }, [code]);
  return (
    <main className="narrow page">
      <h1>{t("Check my case")}</h1>
      {!value ? (
        <>
          <p>
            {t("Enter the Case Code you saved after sending your message.")}
          </p>
          <form
            className="panel form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (code === input) refresh();
              else setCode(input);
            }}
          >
            <label>
              {t("Case Code")}
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                required
                maxLength={40}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
            </label>
            <ErrorBox error={error} />
            <button className="btn primary">
              {t("Open case")}
              <ArrowRight size={18} />
            </button>
          </form>
        </>
      ) : (
        <>
          <div className="case-header">
            <div>
              <span className="eyebrow">{value.school}</span>
              <h2>{t("Anonymous student")}</h2>
            </div>
            <span className={"status " + value.status.replace(" ", "-")}>
              {t(value.status)}
            </span>
          </div>
          <p className="hint">
            {t(
              "Your Case Code stays only in this page’s memory. Reloading the page requires entering it again.",
            )}
          </p>
          <div className="panel chat-panel">
            <Conversation
              value={value}
              kind="student"
              code={code}
              refresh={refresh}
            />
          </div>
          <div className="row between">
            <button className="btn secondary" onClick={refresh}>
              <RefreshCw size={18} />
              {t("Refresh")}
            </button>
            <button
              className="btn secondary"
              onClick={() => {
                setCode("");
                setInput("");
                setValue(null);
              }}
            >
              {t("Leave case")}
            </button>
          </div>
          <ErrorBox error={error} />
        </>
      )}
    </main>
  );
}
function Privacy() {
  const t = useT();
  return (
    <main className="narrow page privacy-page">
      <span className="eyebrow">{t("School Edition")}</span>
      <h1>{t("Privacy in simple words")}</h1>
      {[
        "We do not ask for your name, email, phone number or city. There are no student accounts.",
        "We do not store student IP addresses, device fingerprints, analytics trackers or student identity cookies. Your case is accessed only with its random code.",
        "Your school, messages, optional victim/witness choice and attachments are stored. Message contents and cleaned attachments are encrypted. Only officers assigned to your school can read them. The owner sees statistics, not conversations.",
        "Original names, EXIF and GPS are not saved. Photos are re-encoded and PDF pages are converted to clean images. Visible personal information is not automatically hidden.",
        "Hosting providers may process network information to deliver and protect the website. We cannot promise absolute anonymity if you include identifying details in your message.",
        "Closed cases are deleted by a daily cleanup after the retention period set by the owner (30 days by default). Files are deleted from private storage too. Temporary spam checks expire after 5–60 minutes and are cleared automatically.",
        "Language and display preferences may be saved on your device. Case Codes and conversations are never saved there by this application.",
      ].map((s) => (
        <p key={s}>{t(s)}</p>
      ))}
    </main>
  );
}
function StaffLogin({ kind }: { kind: string }) {
  const t = useT();
  const nav = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="narrow page">
      <span className="eyebrow">
        <LockKeyhole size={18} />
        {t(kind === "owner" ? "Owner workspace" : "Officer workspace")}
      </span>
      <h1>{t("Sign in")}</h1>
      <p>
        {t(
          kind === "owner"
            ? "Sign in with your private owner account."
            : "Only owner-created officer accounts can sign in.",
        )}
      </p>
      <form
        className="panel form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const data = Object.fromEntries(new FormData(e.currentTarget));
            const result = await api(
              "/" + kind + "/login",
              { method: "POST", body: JSON.stringify(data) },
              kind,
            );
            nav("/" + kind + (result.must_change_password ? "/password" : ""));
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          {t("Username")}
          <input
            name="username"
            required
            autoComplete="username"
            maxLength={80}
          />
        </label>
        <label>
          {t("Password")}
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            maxLength={200}
          />
        </label>
        <label>
          {t("Authenticator code (if enabled)")}
          <input
            name="otp"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
          />
        </label>
        <ErrorBox error={error} />
        <button className="btn primary" disabled={busy}>
          {t("Sign in")}
          <ArrowRight size={18} />
        </button>
      </form>
    </main>
  );
}
function PasswordForm({ kind }: { kind: string }) {
  const t = useT();
  const nav = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="narrow page">
      <h1>{t("Change your temporary password")}</h1>
      <p>
        {t(
          "Use a unique password with at least 16 characters. You will sign in again afterwards.",
        )}
      </p>
      <form
        className="panel form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api(
              "/" + kind + "/password",
              {
                method: "POST",
                body: JSON.stringify(
                  Object.fromEntries(new FormData(e.currentTarget)),
                ),
              },
              kind,
            );
            nav("/" + kind + "/login");
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
            type="password"
            name="current_password"
            required
            autoComplete="current-password"
          />
        </label>
        <label>
          {t("New password")}
          <input
            type="password"
            name="new_password"
            required
            minLength={16}
            maxLength={200}
            autoComplete="new-password"
          />
        </label>
        <ErrorBox error={error} />
        <button className="btn primary" disabled={busy}>
          {t("Change password")}
        </button>
      </form>
    </div>
  );
}
function Guard({
  kind,
  children,
}: {
  kind: string;
  children: React.ReactNode;
}) {
  const t = useT();
  const nav = useNavigate();
  const loc = useLocation();
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/" + kind + "/me", {}, kind)
      .then((u) => {
        setUser(u);
        if (u.must_change_password && !loc.pathname.endsWith("/password"))
          nav("/" + kind + "/password");
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401)
          nav("/" + kind + "/login");
        else setError(e.message);
      });
  }, [kind, loc.pathname]);
  if (!user)
    return (
      <main className="container page">
        <ErrorBox error={error} />
        {t("Loading…")}
      </main>
    );
  return (
    <div className="workspace container">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">
            {t(kind === "owner" ? "Owner workspace" : "Officer workspace")}
          </span>
          <span>{user.username}</span>
        </div>
        <div className="row wrap">
          <Link className="btn secondary" to={"/" + kind + "/settings"}>
            <Settings size={18} />
            {t("Settings")}
          </Link>
          <button
            className="btn secondary"
            onClick={async () => {
              try {
                await api("/" + kind + "/logout", { method: "POST" }, kind);
                nav("/" + kind + "/login");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <LogOut size={18} />
            {t("Sign out")}
          </button>
        </div>
      </div>
      <ErrorBox error={error} />
      {user.must_change_password ? <PasswordForm kind={kind} /> : children}
    </div>
  );
}
function PushButton() {
  const t = useT();
  const [error, setError] = useState("");
  const [enabled, setEnabled] = useState(false);
  async function enable() {
    try {
      if (
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      )
        throw new Error("Notifications unavailable in this browser");
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        throw new Error("Allow notifications in browser settings");
      const config = await api("/public/config");
      const raw = config.vapid_public_key.replace(/-/g, "+").replace(/_/g, "/");
      const key = Uint8Array.from(
        atob(raw + "=".repeat((4 - (raw.length % 4)) % 4)),
        (c) => c.charCodeAt(0),
      );
      const registration = await navigator.serviceWorker.ready;
      const sub =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        }));
      await api(
        "/officer/push",
        { method: "POST", body: JSON.stringify(sub.toJSON()) },
        "officer",
      );
      setEnabled(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <button className="btn secondary" onClick={enable}>
        <Bell size={18} />
        {t(enabled ? "Notifications enabled" : "Enable notifications")}
      </button>
      <p className="hint">
        {t(
          "Notifications only name the school; they never include message contents.",
        )}
      </p>
      <ErrorBox error={error} />
    </>
  );
}
function Officer() {
  const t = useT();
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState("");
  const [value, setValue] = useState<CaseDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const currentSelection = useRef(selected);
  currentSelection.current = selected;
  async function list() {
    try {
      setRows(
        await api(
          "/officer/cases?status=" + encodeURIComponent(status),
          {},
          "officer",
        ),
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function detail() {
    if (!selected) return;
    try {
      const result = await api<CaseDetail>(
        "/officer/cases/" + selected,
        {},
        "officer",
      );
      if (currentSelection.current !== selected) return;
      setValue(result);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    list();
    const id = setInterval(() => {
      if (!document.hidden) list();
    }, 12000);
    return () => clearInterval(id);
  }, [status]);
  useEffect(() => {
    setValue(null);
    detail();
    const id = setInterval(() => {
      if (!document.hidden) detail();
    }, 12000);
    return () => clearInterval(id);
  }, [selected]);
  return (
    <>
      <div className="intro-row">
        <div>
          <h1>{t("Cases")}</h1>
          <p>{t("Only cases from your assigned schools appear here.")}</p>
        </div>
        <div>
          <PushButton />
        </div>
      </div>
      <ErrorBox error={error} />
      <div className="officer-grid">
        <aside className="panel case-list">
          <label>
            {t("All statuses")}
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t("All statuses")}</option>
              {["New", "In progress", "Closed"].map((s) => (
                <option value={s} key={s}>
                  {t(s)}
                </option>
              ))}
            </select>
          </label>
          {rows.length ? (
            rows.map((c) => (
              <button
                className={"case-card " + (selected === c.id ? "selected" : "")}
                key={c.id}
                onClick={() => setSelected(c.id)}
              >
                <div className="row between">
                  <strong>{c.school}</strong>
                  {c.unanswered && c.status !== "Closed" && (
                    <span className="new-dot" />
                  )}
                </div>
                <span>
                  {t(
                    c.role === "victim"
                      ? "Victim"
                      : c.role === "witness"
                        ? "Witness"
                        : "Anonymous student",
                  )}
                </span>
                <div className="row between">
                  <span className={"status " + c.status.replace(" ", "-")}>
                    {t(c.status)}
                  </span>
                  <time>{date(c.created_at, t("__locale"))}</time>
                </div>
              </button>
            ))
          ) : (
            <p className="empty">{t("No cases yet")}</p>
          )}
        </aside>
        <section className="panel officer-detail">
          {value ? (
            <>
              <div className="case-header">
                <div>
                  <span className="eyebrow">{value.school}</span>
                  <h2>{t("Anonymous student")}</h2>
                </div>
                <label className="status-control">
                  <span className="sr-only">Status</span>
                  <select
                    value={value.status}
                    disabled={busy}
                    onChange={async (e) => {
                      setBusy(true);
                      try {
                        await api(
                          `/officer/cases/${value.id}/status`,
                          {
                            method: "PATCH",
                            body: JSON.stringify({ status: e.target.value }),
                          },
                          "officer",
                        );
                        await detail();
                        await list();
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {["New", "In progress", "Closed"].map((s) => (
                      <option value={s} key={s}>
                        {t(s)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <Conversation
                value={value}
                kind="officer"
                refresh={async () => {
                  await detail();
                  await list();
                }}
              />
              <details className="notes">
                <summary>
                  {t("Private internal notes")}
                  <small>{t("Never visible to students")}</small>
                </summary>
                {value.notes?.map((n) => (
                  <div className="note" key={n.id}>
                    <p>{n.text}</p>
                    <time>{date(n.created_at, t("__locale"))}</time>
                  </div>
                ))}
                <form
                  className="form-stack"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = e.currentTarget;
                    try {
                      await api(
                        `/officer/cases/${value.id}/notes`,
                        {
                          method: "POST",
                          body: JSON.stringify({
                            text: new FormData(f).get("text"),
                          }),
                        },
                        "officer",
                      );
                      f.reset();
                      await detail();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  <label>
                    {t("Private internal notes")}
                    <textarea name="text" maxLength={10000} required rows={3} />
                  </label>
                  <button className="btn secondary">{t("Add note")}</button>
                </form>
              </details>
            </>
          ) : (
            <div className="empty choose-case">
              <MessageSquare size={36} />
              <h2>{t(selected ? "Loading…" : "Choose a case")}</h2>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
function StaffSettings({ kind }: { kind: string }) {
  const t = useT();
  const [secret, setSecret] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/" + kind + "/me", {}, kind)
      .then((u) => setEnabled(u.two_factor))
      .catch((e) => setError(e.message));
  }, [kind]);
  return (
    <>
      <Link className="back" to={"/" + kind}>
        ← {t("Back")}
      </Link>
      <h1>{t("Settings")}</h1>
      <div className="panel form-stack">
        <h2>{t("Two-factor authentication")}</h2>
        <ErrorBox error={error} />
        {enabled ? (
          <p className="success">{t("Enabled")}</p>
        ) : !secret ? (
          <button
            className="btn secondary"
            onClick={async () => {
              try {
                const result = await api(
                  "/" + kind + "/2fa/setup",
                  { method: "POST" },
                  kind,
                );
                setSecret(result.secret);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            {t("Set up authenticator")}
          </button>
        ) : (
          <>
            <p>
              {t(
                "Add this secret to your authenticator app, save it securely, and enter the 6-digit code.",
              )}
            </p>
            <code className="secret-key">{secret}</code>
            <form
              className="form-stack"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api(
                    "/" + kind + "/2fa/enable",
                    {
                      method: "POST",
                      body: JSON.stringify({
                        code: new FormData(e.currentTarget).get("code"),
                      }),
                    },
                    kind,
                  );
                  setEnabled(true);
                  setSecret("");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <label>
                {t("Authenticator code (if enabled)")}
                <input
                  name="code"
                  required
                  pattern="[0-9]{6}"
                  maxLength={6}
                  inputMode="numeric"
                />
              </label>
              <button className="btn primary">{t("Enable 2FA")}</button>
            </form>
          </>
        )}
      </div>
      <Link className="btn secondary" to={"/" + kind + "/password"}>
        {t("Change password")}
      </Link>
    </>
  );
}
function Owner() {
  const t = useT();
  const [tab, setTab] = useState("Schools");
  const [overview, setOverview] = useState<any>(null);
  const [officers, setOfficers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [schoolEdit, setSchoolEdit] = useState<any>(null);
  const [officerEdit, setOfficerEdit] = useState<any>(null);
  const [credential, setCredential] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      const [o, f, l] = await Promise.all([
        api("/owner/overview", {}, "owner"),
        api("/owner/officers", {}, "owner"),
        api("/owner/audit", {}, "owner"),
      ]);
      setOverview(o);
      setOfficers(f);
      setLogs(l);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  if (!overview)
    return (
      <>
        <ErrorBox error={error} />
        {t("Loading…")}
      </>
    );
  return (
    <>
      <h1>{t("Owner workspace")}</h1>
      <p>
        {t(
          "You can manage schools and accounts. Message contents are not available in this area.",
        )}
      </p>
      <div className="stats">
        <div>
          <span>{t("Schools")}</span>
          <strong>{overview.schools.length}</strong>
        </div>
        <div>
          <span>{t("Officers")}</span>
          <strong>{overview.officers}</strong>
        </div>
        <div>
          <span>{t("Cases")}</span>
          <strong>
            {overview.schools.reduce(
              (n: number, s: School) => n + (s.cases || 0),
              0,
            )}
          </strong>
        </div>
        <div>
          <span>{t("Unanswered")}</span>
          <strong>
            {overview.schools.reduce(
              (n: number, s: School) => n + (s.unanswered || 0),
              0,
            )}
          </strong>
        </div>
      </div>
      <nav className="tabs">
        {["Schools", "Officers", "Audit log", "Settings"].map((s) => (
          <button
            className={tab === s ? "active" : ""}
            key={s}
            onClick={() => {
              setTab(s);
              setSchoolEdit(null);
              setOfficerEdit(null);
            }}
          >
            {t(s)}
          </button>
        ))}
      </nav>
      <ErrorBox error={error} />
      {tab === "Schools" && (
        <>
          <button
            className="btn primary"
            onClick={() =>
              setSchoolEdit({
                name: "",
                number: "",
                district: "",
                active: false,
              })
            }
          >
            <Plus size={18} />
            {t("Add school")}
          </button>
          {schoolEdit && (
            <form
              key={schoolEdit.id || "new-school"}
              className="panel form-stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  const data = Object.fromEntries(
                    new FormData(e.currentTarget),
                  );
                  await api(
                    "/owner/schools" +
                      (schoolEdit.id ? "/" + schoolEdit.id : ""),
                    {
                      method: schoolEdit.id ? "PATCH" : "POST",
                      body: JSON.stringify({
                        ...data,
                        active: data.active === "on",
                      }),
                    },
                    "owner",
                  );
                  setSchoolEdit(null);
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h2>{t(schoolEdit.id ? "Edit" : "Add school")}</h2>
              <label>
                {t("School name")}
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={160}
                  defaultValue={schoolEdit.name}
                />
              </label>
              <div className="two-col">
                <label>
                  {t("Number")}
                  <input
                    name="number"
                    required
                    maxLength={30}
                    defaultValue={schoolEdit.number}
                  />
                </label>
                <label>
                  {t("District (optional)")}
                  <input
                    name="district"
                    maxLength={100}
                    defaultValue={schoolEdit.district}
                  />
                </label>
              </div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={schoolEdit.active}
                />
                {t("Active")}
              </label>
              <div className="row wrap">
                <button className="btn primary" disabled={busy}>
                  {t("Save")}
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setSchoolEdit(null)}
                >
                  {t("Cancel")}
                </button>
              </div>
            </form>
          )}
          <div className="school-cards">
            {overview.schools.map((s: School) => (
              <article className="panel" key={s.id}>
                <div className="row between">
                  <h2>{s.name}</h2>
                  <span
                    className={
                      "status " + (s.active ? "In-progress" : "Closed")
                    }
                  >
                    {t(s.active ? "Active" : "Inactive")}
                  </span>
                </div>
                <div className="school-totals">
                  <span>
                    {t("Officers")}: {s.officers}
                  </span>
                  <span>
                    {t("Cases")}: {s.cases}
                  </span>
                  <span>
                    {t("New")}: {s.new}
                  </span>
                  <span>
                    {t("Unanswered")}: {s.unanswered}
                  </span>
                </div>
                <button
                  className="btn secondary"
                  onClick={() => setSchoolEdit(s)}
                >
                  {t("Edit")}
                </button>
              </article>
            ))}
          </div>
          {!overview.schools.length && (
            <p className="empty">
              {t("No schools yet. Add your first partner school.")}
            </p>
          )}
        </>
      )}
      {tab === "Officers" && (
        <>
          <button
            className="btn primary"
            onClick={() =>
              setOfficerEdit({
                name: "",
                username: "",
                school_ids: [],
                active: true,
              })
            }
          >
            <Plus size={18} />
            {t("Create officer")}
          </button>
          {officerEdit && (
            <form
              key={officerEdit.id || "new-officer"}
              className="panel form-stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  const form = new FormData(e.currentTarget);
                  const data = {
                    name: form.get("name"),
                    username: form.get("username"),
                    school_ids: form.getAll("school_ids"),
                    active: form.get("active") === "on",
                  };
                  const result = await api(
                    "/owner/officers" +
                      (officerEdit.id ? "/" + officerEdit.id : ""),
                    {
                      method: officerEdit.id ? "PATCH" : "POST",
                      body: JSON.stringify(data),
                    },
                    "owner",
                  );
                  if (result.temporary_password)
                    setCredential({
                      username: String(data.username),
                      password: result.temporary_password,
                    });
                  setOfficerEdit(null);
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h2>{t(officerEdit.id ? "Edit" : "Create officer")}</h2>
              <label>
                {t("Name (owner only)")}
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={160}
                  defaultValue={officerEdit.name}
                />
              </label>
              {!officerEdit.id && (
                <label>
                  {t("Username")}
                  <input
                    name="username"
                    required
                    minLength={3}
                    maxLength={80}
                    pattern="[a-zA-Z0-9._-]+"
                    defaultValue={officerEdit.username}
                    autoComplete="off"
                  />
                </label>
              )}
              <fieldset>
                <legend>{t("Assigned schools")}</legend>
                {overview.schools.map((s: School) => (
                  <label className="checkbox" key={s.id}>
                    <input
                      type="checkbox"
                      name="school_ids"
                      value={s.id}
                      defaultChecked={officerEdit.school_ids.includes(s.id)}
                    />
                    {s.name}
                  </label>
                ))}
              </fieldset>
              <label className="checkbox">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={officerEdit.active}
                />
                {t("Active")}
              </label>
              <div className="row wrap">
                <button className="btn primary" disabled={busy}>
                  {t("Save")}
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setOfficerEdit(null)}
                >
                  {t("Cancel")}
                </button>
              </div>
            </form>
          )}
          <div className="school-cards">
            {officers.map((o) => (
              <article className="panel" key={o.id}>
                <div className="row between">
                  <h2>{o.name}</h2>
                  <span className="status">
                    {t(o.active ? "Active" : "Inactive")}
                  </span>
                </div>
                <p>{o.username}</p>
                <p>
                  {overview.schools
                    .filter((s: School) => o.school_ids.includes(s.id))
                    .map((s: School) => s.name)
                    .join(" · ")}
                </p>
                {o.must_change_password && (
                  <p className="hint">
                    {t("First sign-in password change required")}
                  </p>
                )}
                <div className="row wrap">
                  <button
                    className="btn secondary"
                    onClick={() => setOfficerEdit(o)}
                  >
                    {t("Edit")}
                  </button>
                  <button
                    className="btn secondary"
                    onClick={async () => {
                      try {
                        const result = await api(
                          "/owner/officers/" + o.id + "/reset",
                          { method: "POST" },
                          "owner",
                        );
                        setCredential({
                          username: o.username,
                          password: result.temporary_password,
                        });
                        await load();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    {t("Reset password")}
                  </button>
                  <button
                    className="btn danger"
                    onClick={async () => {
                      if (
                        !confirm(
                          t(
                            "Delete this officer account? This cannot be undone.",
                          ),
                        )
                      )
                        return;
                      try {
                        await api(
                          "/owner/officers/" + o.id,
                          { method: "DELETE" },
                          "owner",
                        );
                        await load();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    {t("Delete officer")}
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!officers.length && <p className="empty">{t("No officers yet")}</p>}
        </>
      )}
      {tab === "Audit log" && (
        <div className="panel audit-list">
          {logs.map((l, i) => (
            <article key={i}>
              <strong>{l.actor}</strong>
              <span>{l.action}</span>
              <time>{date(l.created_at, t("__locale"))}</time>
            </article>
          ))}
          {!logs.length && <p>{t("No activity yet")}</p>}
        </div>
      )}
      {tab === "Settings" && (
        <form
          className="panel form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api(
                "/owner/retention",
                {
                  method: "PATCH",
                  body: JSON.stringify({
                    days: Number(new FormData(e.currentTarget).get("days")),
                  }),
                },
                "owner",
              );
              await load();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <label>
            {t("Retention for closed cases (days)")}
            <input
              name="days"
              type="number"
              min={1}
              max={3650}
              defaultValue={overview.retention_days}
              required
            />
          </label>
          <button className="btn primary">{t("Save")}</button>
          <Link to="/owner/settings" className="btn secondary">
            {t("Two-factor authentication")}
          </Link>
        </form>
      )}
      {credential && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={t("Temporary password")}
          >
            <h2>{t("Temporary password")}</h2>
            <p>
              {t(
                "Save it now and share it with the officer securely. It is shown only once.",
              )}
            </p>
            <p>{credential.username}</p>
            <code className="secret-key">{credential.password}</code>
            <button
              className="btn secondary"
              onClick={() =>
                navigator.clipboard
                  .writeText(credential.username + "\n" + credential.password)
                  .catch(() => setError("Request failed"))
              }
            >
              <Copy size={18} />
              {t("Copy code")}
            </button>
            <button className="btn primary" onClick={() => setCredential(null)}>
              {t("Close")}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
function AppRoutes() {
  const location = useLocation();
  const publicPage =
    !location.pathname.startsWith("/officer") &&
    !location.pathname.startsWith("/owner");
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <>
      <Header />
      {publicPage && <Emergency />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/write" element={<Write />} />
        <Route path="/report" element={<Navigate to="/write" replace />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/case" element={<StudentCase />} />
        <Route path="/track" element={<Navigate to="/case" replace />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/officer/login" element={<StaffLogin kind="officer" />} />
        <Route path="/owner/login" element={<StaffLogin kind="owner" />} />
        {["officer", "owner"].map((kind) => (
          <React.Fragment key={kind}>
            <Route
              path={"/" + kind}
              element={
                <Guard kind={kind}>
                  {kind === "owner" ? <Owner /> : <Officer />}
                </Guard>
              }
            />
            <Route
              path={"/" + kind + "/password"}
              element={
                <Guard kind={kind}>
                  <PasswordForm kind={kind} />
                </Guard>
              }
            />
            <Route
              path={"/" + kind + "/settings"}
              element={
                <Guard kind={kind}>
                  <StaffSettings kind={kind} />
                </Guard>
              }
            />
          </React.Fragment>
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </>
  );
}
function App() {
  const [lang, setLang] = useState<Lang>(() => {
    const l = localStorage.getItem("aw_language");
    return l === "ru" || l === "kk" ? l : "en";
  });
  const [school, setSchool] = useState<School | null>(null);
  const [code, setCode] = useState("");
  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem("aw_language", lang);
  }, [lang]);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return (
    <Locale.Provider value={{ lang, setLang }}>
      <StudentContext.Provider value={{ school, setSchool, code, setCode }}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </StudentContext.Provider>
    </Locale.Provider>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
