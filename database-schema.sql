-- School Edition PostgreSQL schema; migrations remain the deployment authority.


CREATE TABLE audit_log (
	id VARCHAR(36) NOT NULL,
	actor VARCHAR(80) NOT NULL,
	action VARCHAR(60) NOT NULL,
	target VARCHAR(80) NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id)
)

;

CREATE INDEX ix_audit_log_created_at ON audit_log (created_at);


CREATE TABLE blob_deletions (
	pathname TEXT NOT NULL,
	PRIMARY KEY (pathname)
)

;


CREATE TABLE officers (
	id VARCHAR(36) NOT NULL,
	name VARCHAR(160) NOT NULL,
	username VARCHAR(80) NOT NULL,
	password_hash TEXT NOT NULL,
	role VARCHAR(12) NOT NULL,
	must_change_password BOOLEAN NOT NULL,
	active BOOLEAN NOT NULL,
	totp_secret TEXT,
	last_totp_step INTEGER NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	CHECK (role IN ('owner','officer')),
	UNIQUE (username)
)

;


CREATE TABLE rate_limits (
	key VARCHAR(64) NOT NULL,
	count INTEGER NOT NULL,
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (key)
)

;

CREATE INDEX ix_rate_limits_expires_at ON rate_limits (expires_at);


CREATE TABLE school_settings (
	id INTEGER NOT NULL,
	retention_days INTEGER NOT NULL,
	PRIMARY KEY (id),
	CHECK (retention_days >= 1 AND retention_days <= 3650)
)

;


CREATE TABLE schools (
	id VARCHAR(36) NOT NULL,
	name VARCHAR(160) NOT NULL,
	number VARCHAR(30) NOT NULL,
	district VARCHAR(100) NOT NULL,
	active BOOLEAN NOT NULL,
	PRIMARY KEY (id)
)

;

CREATE INDEX ix_schools_active ON schools (active);


CREATE TABLE cases (
	id VARCHAR(36) NOT NULL,
	school_id VARCHAR(36) NOT NULL,
	case_code_hash VARCHAR(64) NOT NULL,
	role VARCHAR(10),
	status VARCHAR(20) NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
	closed_at TIMESTAMP WITH TIME ZONE,
	unanswered BOOLEAN NOT NULL,
	PRIMARY KEY (id),
	CHECK (status IN ('New','In progress','Closed')),
	CHECK (role IS NULL OR role IN ('victim','witness')),
	FOREIGN KEY(school_id) REFERENCES schools (id),
	UNIQUE (case_code_hash)
)

;

CREATE INDEX ix_cases_closed_at ON cases (closed_at);

CREATE INDEX ix_cases_created_at ON cases (created_at);

CREATE INDEX ix_cases_school_id ON cases (school_id);

CREATE INDEX ix_cases_status ON cases (status);

CREATE INDEX ix_cases_unanswered ON cases (unanswered);


CREATE TABLE notifications (
	id VARCHAR(36) NOT NULL,
	school_id VARCHAR(36) NOT NULL,
	officer_id VARCHAR(36) NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	delivered_at TIMESTAMP WITH TIME ZONE,
	attempts INTEGER NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(school_id) REFERENCES schools (id),
	FOREIGN KEY(officer_id) REFERENCES officers (id) ON DELETE CASCADE
)

;

CREATE INDEX ix_notifications_officer_id ON notifications (officer_id);


CREATE TABLE officer_schools (
	officer_id VARCHAR(36) NOT NULL,
	school_id VARCHAR(36) NOT NULL,
	PRIMARY KEY (officer_id, school_id),
	FOREIGN KEY(officer_id) REFERENCES officers (id) ON DELETE CASCADE,
	FOREIGN KEY(school_id) REFERENCES schools (id)
)

;


CREATE TABLE push_subscriptions (
	id VARCHAR(36) NOT NULL,
	officer_id VARCHAR(36) NOT NULL,
	endpoint_hash VARCHAR(64) NOT NULL,
	encrypted_subscription TEXT NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(officer_id) REFERENCES officers (id) ON DELETE CASCADE,
	UNIQUE (endpoint_hash)
)

;

CREATE INDEX ix_push_subscriptions_officer_id ON push_subscriptions (officer_id);


CREATE TABLE staff_sessions (
	id_hash VARCHAR(64) NOT NULL,
	officer_id VARCHAR(36) NOT NULL,
	csrf_hash VARCHAR(64) NOT NULL,
	pending_totp TEXT,
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id_hash),
	FOREIGN KEY(officer_id) REFERENCES officers (id) ON DELETE CASCADE
)

;

CREATE INDEX ix_staff_sessions_expires_at ON staff_sessions (expires_at);

CREATE INDEX ix_staff_sessions_officer_id ON staff_sessions (officer_id);


CREATE TABLE messages (
	id VARCHAR(36) NOT NULL,
	case_id VARCHAR(36) NOT NULL,
	sender VARCHAR(10) NOT NULL,
	body TEXT NOT NULL,
	attachment TEXT,
	mime_type VARCHAR(40),
	attachment_size INTEGER,
	attachment_hash VARCHAR(64),
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	CHECK (sender IN ('student','officer')),
	FOREIGN KEY(case_id) REFERENCES cases (id) ON DELETE CASCADE
)

;

CREATE INDEX ix_messages_case_id ON messages (case_id);


CREATE TABLE notes (
	id VARCHAR(36) NOT NULL,
	case_id VARCHAR(36) NOT NULL,
	officer_id VARCHAR(36),
	body TEXT NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(case_id) REFERENCES cases (id) ON DELETE CASCADE,
	FOREIGN KEY(officer_id) REFERENCES officers (id) ON DELETE SET NULL
)

;

CREATE INDEX ix_notes_case_id ON notes (case_id);
