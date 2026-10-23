# MRTECHLMS Enterprise Integration Foundation Architecture

This document provides the formal architecture specification for the eight enterprise integration pillars of MRTECHLMS. Each section details the protocol standards, security models, data contracts, extension points, and explicitly documented unsupported capabilities.

---

## Architecture Summary Matrix

| Integration Pillar | Standard / Protocol | Status | Security Model | Scope & Multi-Tenancy |
| :--- | :--- | :--- | :--- | :--- |
| **1. SSO** | SAML 2.0 Web Browser SSO & OIDC Core 1.0 | Operational Extension Point | Asymmetric X.509 & PKCE Code Exchange | Organization-isolated (`sso_configs`) |
| **2. MFA** | RFC 6238 TOTP & RFC 4226 HMAC-OTP | Fully Operational | HMAC-SHA1 + SHA-256 Hashed Recovery Codes | User-level with tenant enforcement |
| **3. SCORM** | SCORM 1.2 & SCORM 2004 (3rd & 4th Ed.) | Operational Runtime Engine | Isolated Sandboxed iframe + RTE API Bridge | Course & Organization scoped |
| **4. xAPI** | ADL xAPI 1.0.3 / IEEE 9274.1.1 (Tin Can) | Operational LRS Ingestion & Query | Strict RFC 4122 UUID Statements + HMAC | Organization-isolated statement stream |
| **5. LTI** | 1EdTech LTI 1.3 Advantage | Extension Point Ready | OIDC 3-legged launch + RS256 JWKS JWTs | Platform registration per tenant |
| **6. Webhooks** | Outbound HTTPS Webhook Dispatcher | Operational with Retry Engine | HMAC-SHA256 payload signing | Organization-scoped subscriptions |
| **7. Public API** | RESTful HTTP API (Version `v1`) | Operational with Scope Enforcement | Cryptographic API Keys (`mrk_live_...`) | Scoped API Keys + Rate limits per min |
| **8. Import / Export** | RFC 4180 CSV & JSON Schema ETL | Operational Batch Processing | Atomic DB Transactions + Strict Validation | Organization-isolated datasets |

---

## 1. Single Sign-On (SSO) Architecture

### 1.1 Specifications & Workflow
MRTECHLMS implements dual enterprise federation models configured independently per tenant:
1. **SAML 2.0 (Security Assertion Markup Language)**:
   - Profile: SAML 2.0 Web Browser SSO Profile (`urn:oasis:names:tc:SAML:2.0:profiles:SSO:browser`).
   - Bindings: SP-initiated via `HTTP-Redirect` (AuthnRequest) and IdP-initiated/Assertion Consumer Service via `HTTP-POST` (SAMLResponse).
   - NameID Formats: Email address (`urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`) or Persistent Pseudonymous ID (`urn:oasis:names:tc:SAML:2.0:nameid-format:persistent`).
2. **OIDC (OpenID Connect Core 1.0)**:
   - Flow: Authorization Code Flow with Proof Key for Code Exchange (PKCE).
   - Discovery: Standard `/.well-known/openid-configuration` integration.

```
[ Learner Browser ] ───(1. Request Login)───> [ MRTECHLMS SP ]
        │                                             │
        │ <──(2. SAML AuthnRequest / 302 Redirect)───┘
        ▼
[ Corporate IdP (Okta / Entra ID / Google) ]
        │
        │ (3. Authenticate with Corporate Credentials & MFA)
        ▼
[ Learner Browser ] ───(4. HTTP-POST SAMLResponse / ACS)───> [ MRTECHLMS ACS Endpoint ]
                                                                      │
                                                                      ▼
                                                                (5. Verify Signature & Issue JWT)
```

### 1.2 Extension Points & Public Endpoints
- **SP Metadata XML Endpoint**: `GET /api/integrations/sso/metadata/:organizationId.xml`
- **SP Sign-In Initiator**: `GET /api/integrations/sso/login/:organizationId`
- **Assertion Consumer Service (ACS)**: `POST /api/integrations/sso/saml/acs/:organizationId`
- **OIDC Callback Handler**: `GET /api/integrations/sso/oidc/callback/:organizationId`

### 1.3 Unsupported Functionality (Explicitly Marked)
> [!WARNING] Unsupported Legacy Authentication Protocols:
> - **WS-Federation / WS-Trust**: Obsolete Active Directory federation protocols are not supported.
> - **Direct LDAP / Active Directory Socket Binding**: For cloud security, direct LDAP queries over port 389/636 across firewall boundaries are rejected. Customers must bridge directory services via SAML 2.0 or OIDC.
> - **CAS (Central Authentication Service)**: Not supported in the standard cloud distribution.

---

## 2. Multi-Factor Authentication (MFA)

### 2.1 Technical Architecture
MRTECHLMS implements standard Time-based One-Time Passwords complying strictly with **RFC 6238** (TOTP) and **RFC 4226** (HOTP):
- **Algorithm**: `HMAC-SHA1` with 30-second time steps ($T_0 = 0$, $X = 30$).
- **Digits**: 6 decimal digits generated via dynamic truncation.
- **Clock Drift Tolerance**: $\pm 1$ time step window ($\pm 30$ seconds) to accommodate mobile device clock skew.
- **Secret Generation**: 160-bit (20-byte) cryptographically secure random bytes encoded in standard Base32 (`ABCDEFGHIJKLMNOPQRSTUVWXYZ234567`).
- **QR Code URI**: `otpauth://totp/MRTECHLMS:<email>?secret=<base32>&issuer=MRTECHLMS&algorithm=SHA1&digits=6&period=30`.

### 2.2 Recovery Codes Lifecycle
- During enrollment, **8 cryptographically generated backup recovery codes** (`XXXX-XXXX`) are issued.
- **Storage**: Plaintext recovery codes are presented to the user **once** and never stored. Only SHA-256 hashes (`crypto.createHash('sha256').update(code).digest('hex')`) are stored in `user_mfa_settings.recoveryCodesHash`.
- **Single-Use Consumption**: When a user presents a recovery code during a login challenge, the matching hash is immediately deleted from the array, preventing replay attacks.

---

## 3. SCORM (Sharable Content Object Reference Model)

### 3.1 Supported Standards
- **SCORM 1.2 (2001)**: Implements client-side JavaScript RTE bridge `window.API` with CMI data model elements (`cmi.core.lesson_status`, `cmi.core.score.raw`, `cmi.core.lesson_location`, `cmi.suspend_data`).
- **SCORM 2004 (3rd & 4th Edition)**: Implements client-side JavaScript RTE bridge `window.API_1484_11` (`cmi.completion_status`, `cmi.success_status`, `cmi.score.scaled`, `cmi.location`).

### 3.2 Runtime Environment (RTE) Lifecycle
```
[ SCORM Package in iframe ] ────> window.API.LMSInitialize("") ───> [ LMS RTE Bridge ]
            │                                                               │
            │ ────> window.API.LMSSetValue("cmi.core.lesson_location", "p5") │
            │ ────> window.API.LMSSetValue("cmi.core.lesson_status", "completed")
            │ ────> window.API.LMSSetValue("cmi.core.score.raw", "95")       │
            │ ────> window.API.LMSCommit("") ─────────────────────────────> [ POST /api/integrations/scorm/packages/:id/rte/commit ]
            │                                                               │ (Persists progress to MySQL scorm_registrations)
            ▼                                                               ▼
window.API.LMSFinish("") ─────────────────────────────────────────────> [ POST /api/integrations/scorm/packages/:id/rte/finish ]
                                                                          (Syncs course completion metrics)
```

### 3.3 Unsupported Functionality (Explicitly Marked)
> [!WARNING] Unsupported SCORM Standards:
> - **AICC (CMI001) / HACP**: Legacy 1993 HTTP-based AICC protocol is deprecated and unsupported.
> - **SCORM 1.0 & SCORM 1.1**: Draft versions prior to SCORM 1.2 are unsupported.

---

## 4. xAPI (Experience API / Tin Can)

### 4.1 Statement Architecture
All statements conform strictly to the ADL xAPI 1.0.3 specification:
- **Actor**: Identified by `mbox` (`mailto:user@domain.com`) or system account identity.
- **Verb**: Validated against standard registry verbs (`experienced`, `attempted`, `completed`, `passed`, `failed`, `answered`, `interacted`).
- **Object**: Activity IRI uniquely resolving to the course, lesson, or evaluation assessment.
- **Result**: Scaled score (-1.0 to 1.0), raw score, boolean success, boolean completion, and ISO 8601 duration string (e.g. `PT45M12S`).
- **Context**: Captures LMS registration ID, instructor metadata, grouping parent activities, and platform extensions.

### 4.2 External LRS Dispatch Engine
- Table `xapi_lrs_destinations` stores external endpoint URLs (e.g., Watershed LRS, Learning Locker, Veracity).
- Background queue dispatches statements asynchronously with HTTP Basic or Token authentication without delaying student API responses.

---

## 5. LTI (Learning Tools Interoperability)

### 5.1 LTI 1.3 Advantage Specification
MRTECHLMS implements the modern **IMS Global / 1EdTech LTI 1.3 Advantage** architecture:
1. **OIDC 3-Legged Launch Flow**:
   - Platform initiates launch with `login_hint` and `target_link_uri`.
   - Tool returns authorization request to platform OIDC endpoint.
   - Platform posts signed `id_token` (JWT signed with platform RS256 private key).
2. **Public JWKS**:
   - MRTECHLMS publishes its public key set at `/api/integrations/lti/jwks.json`.
3. **LTI Advantage Extensions**:
   - **Deep Linking (LTI-DL 2.0)**: Allows instructors in external institutional learning systems to embed courses into institutional syllabi.
   - **Assignment and Grade Services (AGS 2.0)**: Grades pass back automatically to the university/enterprise gradebook.
   - **Names and Role Provisioning Services (NRPS 2.0)**: Automatic roster and group membership synchronization.

> [!CAUTION] Obsolete LTI Standards:
> - **LTI 1.0, 1.1, and 1.2**: Deprecated by 1EdTech due to shared secret OAuth 1.0a security deprecation; rejected by MRTECHLMS.
> - **LTI 2.0**: Formally obsoleted by the consortium and not supported.

---

## 6. Webhooks & Event Subscriptions

### 6.1 Event Registry
- `user.created`: Provisioning of learner, trainer, or manager profile.
- `user.updated`: User profile or department membership changes.
- `course.completed`: Learner completes 100% of course curriculum.
- `assessment.passed`: Passing score achieved on an assessment.
- `certificate.issued`: Cryptographic certificate issued with verification code.
- `gamification.badge_awarded`: Milestone achievement badge unlocked.
- `enrollment.assigned`: Course or learning path assigned to user.

### 6.2 Security & Cryptographic Signing
Every outbound HTTP webhook request is signed using HMAC-SHA256:
- Secret: Subscription-specific secret key generated as `whsec_<48-hex-chars>`.
- Signature Header: `X-MRTech-Signature: sha256=<hex_digest>`.
- Metadata Headers: `X-MRTech-Event`, `X-MRTech-Delivery`, `X-MRTech-Timestamp`.

### 6.3 Retry Policy & Delivery Logs
- **Max Retries**: 3 attempts.
- **Backoff Schedule**: Attempt 1 immediately; Attempt 2 at +2 seconds; Attempt 3 at +8 seconds.
- **Audit Logs**: Every attempt is logged in `webhook_deliveries` with HTTP status code, duration in milliseconds, response snippet, and error classification.

---

## 7. Public API (Developer Platform)

### 7.1 Key Generation & Security
- Key format: `mrk_live_<48-hex-chars>` (prefix `mrk_live_` for visual discovery and secret scanning).
- Hashing: Plaintext key is displayed **only once** upon generation. The database only stores `SHA-256(raw_key)`.
- Transmission: Passed via `X-API-Key: mrk_live_...` or `Authorization: Bearer mrk_live_...`.

### 7.2 Granular Scopes
- `users:read`, `users:write`
- `courses:read`, `courses:write`
- `enrollments:read`, `enrollments:write`
- `assessments:read`
- `reports:read`
- `webhooks:manage`

### 7.3 Rate Limiting
- Default rate limit: 60 requests / minute / key (configurable per tenant).
- Standard response headers:
  - `X-RateLimit-Limit`: Maximum allowable requests per minute.
  - `X-RateLimit-Remaining`: Remaining request quota in current window.
  - `X-RateLimit-Reset`: Seconds remaining until quota reset.

---

## 8. Bulk Import / Export (ETL Foundation)

### 8.1 Data Contracts
- **Users**: Import/Export via RFC 4180 CSV (`name`, `email`, `role`, `jobTitle`, `departmentName`). Auto-provisions passwords and validates emails.
- **Courses**: Export metadata, lesson counts, categories, and enrollment counts.
- **Groups**: Export group hierarchies, codes, and membership rosters.
- **Enrollments**: Bulk batch assignment via CSV with automatic course title and student email resolution.
- **Assessment Results**: Comprehensive CSV exports of question attempts, scores, and pass/fail statuses for external LMS migration and academic auditing.
