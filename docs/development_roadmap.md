# DGO Enterprise CRM: Master Development Roadmap

This document serves as the master engineering roadmap for the Decent Global Outsourcing (DGO) Enterprise CRM. The phases are structured to follow Clean Architecture and Domain-Driven Design (DDD) principles, ensuring that foundations are built first, module dependencies flow cleanly, and each phase delivers a testable, vertically-sliced increment of the SaaS platform.

---

## Roadmap Overview

```
Phase 1: Foundations & IAM (Weeks 1-4)
  └── Phase 2: Lead Management & Pipeline (Weeks 5-8)
        └── Phase 3: Sales, Deals & Contracting (Weeks 9-13)
              └── Phase 4: Project Delivery & Resource Operations (Weeks 14-19)
                    └── Phase 5: Timesheets, Expenses & Billing (Weeks 20-25)
                          └── Phase 6: Client Portal & Ticket Desk (Weeks 26-32)
                                └── Phase 7: Analytics, Reports & Deploy (Weeks 33-36)
```

---

## Phase 1: Core Foundation & Identity Access Management (IAM)

### 1.1 Objectives
* Scaffold the monorepo architecture for NestJS (Backend) and Next.js 16 (Frontend).
* Setup the multi-tenant PostgreSQL database layer and Prisma schema foundation.
* Establish secure stateless JWT authentication, Refresh Token Rotation (RTR), and Multi-Factor Authentication (MFA).
* Deploy Role-Based Access Control (RBAC) with hierarchical department boundaries.
* Build the immutable security and compliance audit log system.

### 1.2 Modules
* `IAM` (Auth, Session Revocation)
* `Users` (Profiles, Invitations)
* `Roles & Permissions` (RBAC Matrix)
* `Departments` (Divisional Structures)
* `Audit Logs` (Security Tracking)

### 1.3 Dependencies
* None (Foundational stage).

### 1.4 Deliverables
* **Database**: PostgreSQL Docker instance, Prisma client initialized, and initial seed script with standard roles (`SuperAdmin`, `TenantAdmin`, `ProjectManager`, `SalesRepresentative`, `TeamMember`, `ClientContact`).
* **Backend**: 
  * Express/NestJS server scaffolding with Helmet, CORS, and Rate-limiting middleware.
  * Stateless token issuing endpoint (Access token: 15 mins) and Secure, HttpOnly cookie rotated refresh endpoint (Refresh token: 7 days).
  * MFA TOTP/SMS validation endpoints.
  * Global filters (Prisma middleware) enforcing tenant isolation at the query level.
  * Audit logging interceptor that records auth transitions and configuration modifications.
* **Frontend**:
  * Next.js App Router scaffolding with custom folder organization.
  * Secure auth context wrappers, login/MFA validation pages, and workspace route guards.

### 1.5 Estimated Complexity
* **Complexity**: High
* **Rationale**: Establishing secure, leak-proof multi-tenancy and cryptographic refresh token rotation requires deep validation and leaves no room for security errors.

### 1.6 Risks & Mitigation
* **Risk 1: Multi-Tenant Data Leakage**. Developers might forget to append tenant filters to database queries.
  * *Mitigation*: Restrict direct database access. Enforce tenant filters programmatically via a custom Prisma Client extension that injects `where: { tenantId }` automatically on all CRUD calls.
* **Risk 2: Token Theft & Replay Attacks**. If a refresh token is stolen, an attacker can maintain session longevity.
  * *Mitigation*: Implement Refresh Token Rotation (RTR). If the system detects a previously used refresh token, it immediately revokes the entire token family (invalidating all sessions for that user).

### 1.7 Definition of Done (DoD)
* **Code Verification**: All routes are protected by a global auth guard checking JWT signature and expiration.
* **Testing**: 
  * Unit tests cover password validation (12+ characters, complex entropy) and RBAC guard resolutions.
  * Integration tests check token rotation flow and replay attack trigger invalidation.
* **Security**: No database credentials or JWT secrets are hardcoded; all configuration is loaded via environment variables validated at boot time.
* **Audit**: Every login, failed attempt, password change, and token refresh creates an immutable row in the `AuditLog` table.

---

## Phase 2: Lead Acquisition & Pipeline Management

### 2.1 Objectives
* Build the lead capture pipelines to ingest prospects from APIs, webhooks, and manual uploads.
* Deploy the automated deduplication checks, inbound lead scoring, and routing queues.
* Scaffold lead conversion pipelines that atomically transition leads into accounts, contacts, and deals.

### 2.2 Modules
* `Leads` (Scoring, Ingestion, Routing)
* `Accounts` (Basic entity structure)
* `Contacts` (Basic entity structure)

### 2.3 Dependencies
* **Phase 1**: (IAM is required for authenticating sales representatives and auditing lead updates).

### 2.4 Deliverables
* **Backend**:
  * Secure public API endpoint `/api/v1/leads/webhook` with API key validation for third-party landing pages.
  * Lead scoring logic module calculating score based on budget, company size, and email domain validity.
  * Routing manager executing round-robin and territory-based lead distribution.
  * Single-transaction conversion endpoint that moves a lead stage to `CONVERTED` and creates the `Account`, `Contact`, and basic `Opportunity` structures.
* **Frontend**:
  * Lead board UI containing custom Kanban lists (`NEW` ➔ `CONTACTED` ➔ `QUALIFIED` ➔ `NURTURING` ➔ `UNQUALIFIED`).
  * Lead details workspace displaying scoring parameters, routing queues, and active sales rep allocations.
  * Conversion modal mapping lead attributes directly into Accounts and Contacts.

### 2.5 Estimated Complexity
* **Complexity**: Medium
* **Rationale**: Requires atomic transaction boundaries and matching algorithms, but does not involve complex financial integrations.

### 2.6 Risks & Mitigation
* **Risk 1: Round-Robin Concurrency Collision**. Two reps could simultaneously be assigned the same lead if requests execute in parallel.
  * *Mitigation*: Implement a Redis-backed distributed lock or atomic sequence counter to block double-allocation transactions.
* **Risk 2: Ingestion SPAM / DDoS**. Public endpoints could be flooded with bogus lead creations.
  * *Mitigation*: Put in place strict rate limit rules using NestJS Throttler for public webhook endpoints and require recaptcha validation or secret origin key checks.

### 2.7 Definition of Done (DoD)
* **Code Verification**: All lead status transitions conform to Business Rules (e.g., leads in `Qualified` stage for 48+ hours flag warnings).
* **Testing**:
  * Load test verify that lead creation endpoints process 10,000 requests/hr.
  * Duplicate check logic is tested with fuzzy string match cases (email, phone, domain matches).
* **Security**: Converted leads are automatically set to read-only; attempts to modify converted leads return a 403 Forbidden error.

---

## Phase 3: Sales Directories, Proposals, & Contracting

### 3.1 Objectives
* Deploy comprehensive corporate B2B directories mapping accounts and primary/billing contacts.
* Implement opportunity forecasting boards using weighted pipeline formulas.
* Build the proposal and quotation generator, including margin computations and approval thresholds.
* Integrate digital signature flows (DocuSign/Adobe Sign) and legal contract repositories.

### 3.2 Modules
* `Clients / Accounts` (Parent-Subsidiary Trees)
* `Contacts` (Decision Hierarchy, GDPR settings)
* `Deals / Opportunities` (Forecast Pipeline)
* `Quotations` (Margin Builders)
* `Contracts` (SOW Management)

### 3.3 Dependencies
* **Phase 2**: (Lead conversion outputs form the inputs for Accounts, Contacts, and Opportunities).

### 3.4 Deliverables
* **Backend**:
  * Hierarchical account endpoints supporting parent-subsidiary structures and roll-up metrics.
  * Quotation engine calculating unit rates, margin offsets, and dynamic discount thresholds (requiring PM validation).
  * PDF compiler using HTML templates to generate version-controlled proposal documents.
  * Contract management system exposing digital signature triggers and processing e-sign status webhooks.
* **Frontend**:
  * Account tree viewer showing subsidiaries and aggregate revenue values.
  * Opportunity detail screen mapping stage probabilities and multi-currency values.
  * Visual Quotation Builder allowing drag-and-drop margin customization.
  * Client Portal proposal acceptance gateway.

### 3.5 Estimated Complexity
* **Complexity**: High
* **Rationale**: Incorporates precise floating/decimal math, multi-currency values, dynamically compiled PDF media, and external digital signature hook architectures.

### 3.6 Risks & Mitigation
* **Risk 1: Floating Point Math Discrepancies**. JavaScript/TypeScript native floating points (`0.1 + 0.2 === 0.30000000000000004`) will cause billing and accounting calculation mismatches.
  * *Mitigation*: Utilize database-native `Decimal` columns (`Prisma.Decimal`) and runtime calculation wrappers like `Decimal.js` to enforce precision.
* **Risk 2: Pricing Shifts Mutating Historical Quotes**. If product prices change, past quotes could re-calculate incorrect values.
  * *Mitigation*: Always clone product metadata, name, and values into static snapshots directly on the `QuoteLineItem` table during creation rather than dynamically referencing foreign price logs.

### 3.7 Definition of Done (DoD)
* **Code Verification**: Contract transitions follow state invariants (Draft ➔ Review ➔ Active ➔ Renewed ➔ Terminated).
* **Testing**:
  * Complete unit tests validating discount limits (e.g., >20% triggers automatic supervisor authorization).
  * Webhook validation tests verifying signatures of incoming DocuSign events before updating contract status.
* **Security**: PDFs are compiled in isolated sandboxes and saved to secure Supabase Storage buckets, with read operations restricted by active session permissions.

---

## Phase 4: Project Onboarding & Delivery Operations

### 4.1 Objectives
* Scaffold onboarding projects automatically when opportunities are set to "Closed-Won".
* Implement resource allocation systems matching internal engineering teams to client pods.
* Build task management boards supporting dependency mapping and sprint cycles.
* Integrate scheduling systems with Google/Outlook calendars.

### 4.2 Modules
* `Projects` (Pod Scaffolding)
* `Tasks` (Kanban boards, Dependencies)
* `Milestones` (Sign-off triggers)
* `Calendar` (Workspace Sync)
* `Documents` (Document Registry, OCR index)

### 4.3 Dependencies
* **Phase 3**: (Contract sign-off event triggers project instantiation).

### 4.4 Deliverables
* **Backend**:
  * Project initialization logic triggered by `ContractSigned` domain event handler.
  * Resource allocation panel allocating developers to pod structures.
  * Task management system tracking milestones, work priorities, and blocker links.
  * Two-way Google/Outlook Calendar sync connectors utilizing OAuth2 keys.
  * Cloud storage wrappers integrated with Supabase bucket interfaces, including file scanning and OCR text extraction.
* **Frontend**:
  * Project dashboard displaying SLA metrics and team capacity logs.
  * Interactive Kanban/Gantt components for tasks and milestones.
  * Dynamic calendar showing resource availability.
  * Secure document manager for uploading and categorizing deliverables.

### 4.5 Estimated Complexity
* **Complexity**: High
* **Rationale**: Complex data visualizations (Gantt critical paths), 2-way third-party calendar sync schedules, and large binary media pipelines (secure uploads).

### 4.6 Risks & Mitigation
* **Risk 1: Calendar Sync Rate Limits**. High volumes of calendar updates could result in Google/Outlook API lockout.
  * *Mitigation*: Execute calendar mutations asynchronously via a background task worker queue (e.g., BullMQ) with built-in retry delays and back-off configurations.
* **Risk 2: File Upload Security Hazards**. Clients or users could upload malicious executables or scripts into shared folders.
  * *Mitigation*: Pass uploads through an antivirus analyzer before saving. Generate randomly masked keys on storage buckets and set strict Content-Security-Policy download parameters to prevent client-side script execution.

### 4.7 Definition of Done (DoD)
* **Code Verification**: Files are locked down to organization scopes; users from Tenant A cannot fetch document keys for Tenant B under any circumstance.
* **Testing**:
  * Unit tests check blocker checks (e.g., Task B cannot be set to Complete if blocking Task A is open).
  * Integration tests check Google API token rotation flow.
* **Security**: Files are encrypted at rest via AES-256 (handled by storage endpoints) and encrypted in transit via TLS 1.3.

---

## Phase 5: Timesheets, Expenses, & Automated Billing

### 5.1 Objectives
* Build the operational logging dashboard for resource timesheets.
* Implement expense submission workflows containing receipt upload OCR scanning.
* Deploy the automated invoicing engine, connecting timesheets and project milestones to billable items.
* Integrate Stripe checkout portals (credit card, ACH, SEPA) and tax calculations (Avalara).

### 5.2 Modules
* `Invoices` (Billing Engine)
* `Payments` (Stripe Integration, Ledgers)
* `Expenses` (OCR Processing, Approvals)

### 5.3 Dependencies
* **Phase 4**: (Timesheets are submitted against Projects and Tasks; Milestones act as invoice triggers).

### 5.4 Deliverables
* **Backend**:
  * Timesheet submission, correction, and multilevel approval workflows.
  * OCR parser pipeline processing uploaded receipts and extracting merchant/value details.
  * Invoice generator consolidating retainer burn down rates and hours.
  * Avalara dynamic tax handler query interface.
  * Stripe subscription, checkout, and webhook controllers.
  * Immutable double-entry financial ledger records database tables.
* **Frontend**:
  * Time tracking log screen.
  * Expense submission forms featuring drag-and-drop receipt capture.
  * Invoicing control panel tracking draft reviews, adjustments, and collection states.
  * Stripe Elements secure checkout forms.

### 5.5 Estimated Complexity
* **Complexity**: Very High
* **Rationale**: Handling financial ledgers, automated dunning schedules, receipt OCR parsers, Stripe webhook reconciliation, and tax integration requires zero tolerance for logic errors.

### 5.6 Risks & Mitigation
* **Risk 1: Stripe Webhook Duplicate Deliveries**. Stripe could send duplicate events, potentially causing double payment logs.
  * *Mitigation*: Implement an event-log verification table. Insert Stripe Event ID (`evt_...`) under a unique constraint before running logic. If insertion fails, reject duplicate execution immediately.
* **Risk 2: Inaccurate OCR receipt extractions**. OCR scanning will occasionally misinterpret dates or currency values.
  * *Mitigation*: Treat OCR extraction strictly as a suggestion. Populate fields in draft state but force human validation and manual confirmation before final submission.

### 5.7 Definition of Done (DoD)
* **Code Verification**: Invoices must match database values precisely. Double-entry ledgers must balance to zero.
* **Testing**:
  * High-coverage unit tests cover the billing engine calculations (discounts, VAT rules, hourly bounds).
  * Stripe mock sandbox endpoints are validated under failure scenarios (card declines, SEPA pending states, refund loops).
* **Security**: Client payment methods (card details, bank accounts) are never stored in the CRM database; they are securely kept on Stripe’s network.

---

## Phase 6: Client Portal & Ticket Desk Operations

### 6.1 Objectives
* Scaffold the external, white-labeled client workspace displaying billing, tickets, and tasks.
* Deploy an omnichannel support ticket management system.
* Build SLA timers, priority queues, routing mechanisms, and CSAT loops.
* Build real-time communication feeds and notification popovers.

### 6.2 Modules
* `Client Portal` (External UI Workspace)
* `Support Tickets` (SLA Engines)
* `Notifications` (WebSockets, SMS, Email Dispatcher)
* `Dashboard` (Customer Widgets)

### 6.3 Dependencies
* **Phase 4 & Phase 5**: (Client portal needs to pull invoices from Phase 5 and project deliverables from Phase 4).

### 6.4 Deliverables
* **Backend**:
  * External magic link generation and secure token validation logic.
  * Support ticketing engine with routing rules based on subject and team capability.
  * Real-time WebSocket server dispatching client workspace updates.
  * Omnichannel routing system connecting Twilio SMS, SMTP SendGrid, and in-app feeds.
  * CSAT survey dispatch cron handlers.
* **Frontend**:
  * White-labeled portal layout displaying billing histories, project trackers, and support tickets.
  * Ticket creation interfaces and live support chat windows.
  * In-app notification center popover.

### 6.5 Estimated Complexity
* **Complexity**: Medium-High
* **Rationale**: WebSockets scaling limits, portal white-label customization logic, and SLA timers.

### 6.6 Risks & Mitigation
* **Risk 1: Dynamic Client White-labeling Vulnerabilities**. Custom branding configurations could expose CSS or HTML insertion bugs (XSS).
  * *Mitigation*: Restrict client personalization to static configuration parameters (color codes, logo URLs loaded from secure sources). Sanitize input values and avoid executing dynamic HTML styles.
* **Risk 2: Client Access Scoping Failure**. A client could bypass URL params and fetch details from a competitive account.
  * *Mitigation*: Bind portal auth tokens to individual accounts. Enforce strict session checks validating that the target resource belongs to the token owner’s tenant context.

### 6.7 Definition of Done (DoD)
* **Code Verification**: The client workspace is completely isolated. No internal DGO administrative routes are exposed to portal clients.
* **Testing**:
  * SLA alarms trigger warnings when tickets approach violation timers.
  * WebSockets reconnection is validated during network drops.
* **Security**: Magic links are configured as single-use only and automatically expire after a 15-minute window.

---

## Phase 7: Analytics, BI Reports, & Production Deployment

### 7.1 Objectives
* Compile reporting pipelines collecting MRR, ARR, resource utilization, and conversion metrics.
* Build customizable analytics widgets and data exporters (CSV, PDF, Excel).
* Configure full application telemetry, health monitoring, and audit log analyzers.
* Build GitHub Actions pipelines and deploy the system to production AWS ECS Fargate.

### 7.2 Modules
* `Reports` (BI Engines)
* `Settings` (API Configurations)
* `Monitoring` (APM Integrations)

### 7.3 Dependencies
* **All previous Phases**: (Reports and telemetry compile metrics from across the entire CRM).

### 7.4 Deliverables
* **Backend**:
  * Analytical database query modules optimized for aggregation.
  * Export manager compiling JSON records into Excel, CSV, and PDF layouts.
  * OpenTelemetry tracing setups, prometheus metrics feeds, and heartbeats.
  * Production-ready Dockerfiles and task configurations.
  * CI/CD script running database migrations and schema updates.
* **Frontend**:
  * Interactive chart boards (ARR, MRR, Collections, Outstanding Debt).
  * Custom query exporter interface.
  * Sentry diagnostic logger config setup.

### 7.5 Estimated Complexity
* **Complexity**: Medium-High
* **Rationale**: Structuring performant analytical queries over large relational datasets, setting up secure production CI/CD pipelines, and establishing infrastructure parameters.

### 7.6 Risks & Mitigation
* **Risk 1: Slow Reporting Queries**. Large dataset scans will cause database locks and degrade application response times.
  * *Mitigation*: Create database read-replicas for analytical operations. Use indexes and build cached reporting summaries updated via cron routines.
* **Risk 2: CI/CD Migration Failures**. Database migration steps could fail mid-deploy, corrupting the production schema.
  * *Mitigation*: Run migration checks on a staging schema before updating production. Execute all migration steps in atomic DDL transactions where supported, and configure immediate rollout reversion strategies.

### 7.7 Definition of Done (DoD)
* **Code Verification**: Production configurations utilize secret managers; no API tokens or passwords reside in configuration registries.
* **Testing**:
  * Reports download and render in <2 seconds.
  * Static analysis tools (Snyk, SonarQube) return zero critical bugs.
* **Security**: Infrastructure configuration satisfies SOC2 security criteria (encrypted logs, isolated networks).
