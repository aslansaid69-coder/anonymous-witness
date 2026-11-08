-- PostgreSQL schema generated from SQLAlchemy metadata. Apply migrations using Alembic.


CREATE TABLE rate_buckets (
	key VARCHAR(64) NOT NULL, 
	count INTEGER NOT NULL, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (key)
)

;

CREATE INDEX ix_rate_buckets_expires_at ON rate_buckets (expires_at);


CREATE TABLE reports (
	id VARCHAR(36) NOT NULL, 
	report_number VARCHAR(40) NOT NULL, 
	category VARCHAR(50) NOT NULL, 
	encrypted_description TEXT NOT NULL, 
	encrypted_location TEXT NOT NULL, 
	incident_date DATE NOT NULL, 
	incident_time TIME WITHOUT TIME ZONE NOT NULL, 
	status VARCHAR(60) NOT NULL, 
	access_token_hash VARCHAR(64) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	CHECK (status IN ('Submitted','Under Review','Additional Information Requested','In Progress','Resolved','Rejected')), 
	CHECK (category IN ('Theft','Fraud','Violence','Corruption','Cybercrime','Drug-related activity','Suspicious activity','Other')), 
	UNIQUE (report_number)
)

;

CREATE INDEX ix_reports_incident_date ON reports (incident_date);

CREATE INDEX ix_reports_category ON reports (category);

CREATE INDEX ix_reports_status ON reports (status);

CREATE INDEX ix_reports_created_at ON reports (created_at);


CREATE TABLE submission_uploads (
	id VARCHAR(36) NOT NULL, 
	token_hash VARCHAR(64) NOT NULL, 
	content_type VARCHAR(200) NOT NULL, 
	total_bytes INTEGER NOT NULL, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	CHECK (total_bytes > 0 AND total_bytes <= 54525952)
)

;

CREATE INDEX ix_submission_uploads_expires_at ON submission_uploads (expires_at);


CREATE TABLE users (
	id VARCHAR(36) NOT NULL, 
	username VARCHAR(80) NOT NULL, 
	password_hash TEXT NOT NULL, 
	role VARCHAR(20) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	CHECK (role IN ('officer','admin')), 
	UNIQUE (username)
)

;


CREATE TABLE audit_logs (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	action VARCHAR(80) NOT NULL, 
	report_id VARCHAR(36), 
	timestamp TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(report_id) REFERENCES reports (id)
)

;

CREATE INDEX ix_audit_logs_timestamp ON audit_logs (timestamp);

CREATE INDEX ix_audit_logs_user_id ON audit_logs (user_id);


CREATE TABLE evidence (
	id VARCHAR(36) NOT NULL, 
	report_id VARCHAR(36) NOT NULL, 
	original_filename TEXT NOT NULL, 
	stored_filename VARCHAR(80) NOT NULL, 
	mime_type VARCHAR(80) NOT NULL, 
	file_size INTEGER NOT NULL, 
	file_hash VARCHAR(64) NOT NULL, 
	encrypted_content BYTEA, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(report_id) REFERENCES reports (id), 
	UNIQUE (stored_filename)
)

;

CREATE INDEX ix_evidence_report_id ON evidence (report_id);


CREATE TABLE messages (
	id VARCHAR(36) NOT NULL, 
	report_id VARCHAR(36) NOT NULL, 
	sender_type VARCHAR(20) NOT NULL, 
	encrypted_message TEXT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	read_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	CHECK (sender_type IN ('citizen','officer','internal')), 
	FOREIGN KEY(report_id) REFERENCES reports (id)
)

;

CREATE INDEX ix_messages_report_id ON messages (report_id);


CREATE TABLE sessions (
	id_hash VARCHAR(64) NOT NULL, 
	user_id VARCHAR(36), 
	report_id VARCHAR(36), 
	csrf_hash VARCHAR(64) NOT NULL, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id_hash), 
	CHECK ((user_id IS NULL) != (report_id IS NULL)), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(report_id) REFERENCES reports (id)
)

;

CREATE INDEX ix_sessions_expires_at ON sessions (expires_at);


CREATE TABLE status_history (
	id VARCHAR(36) NOT NULL, 
	report_id VARCHAR(36) NOT NULL, 
	old_status VARCHAR(60), 
	new_status VARCHAR(60) NOT NULL, 
	changed_by VARCHAR(36), 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(report_id) REFERENCES reports (id), 
	FOREIGN KEY(changed_by) REFERENCES users (id)
)

;

CREATE INDEX ix_status_history_report_id ON status_history (report_id);


CREATE TABLE submission_chunks (
	upload_id VARCHAR(36) NOT NULL, 
	position INTEGER NOT NULL, 
	encrypted_content BYTEA NOT NULL, 
	PRIMARY KEY (upload_id, position), 
	CHECK (position >= 0 AND position < 104), 
	FOREIGN KEY(upload_id) REFERENCES submission_uploads (id) ON DELETE CASCADE
)

;
