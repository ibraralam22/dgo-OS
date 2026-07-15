# DGO Enterprise CRM: Database Architecture Review
**Author**: Principal Database Architect  
**Review Target**: DGO CRM PostgreSQL Schema Design (v1.0)  
**Status**: Critical Architecture Review (Prior to Code Initialization)

---

## Executive Summary

As a Principal Database Architect reviewing the database schema designed for the Decent Global Outsourcing (DGO) Enterprise CRM, I have conducted a stress-test evaluation of the schema's security, multi-tenancy isolation boundaries, data normalization, performance constraints, and long-term scalability. 

While the initial schema establishes standard Clean Architecture boundaries and utilizes PostgreSQL properties (like UUIDs, Timestamptz, and basic indexing), it contains several **architectural vulnerabilities**, **security gaps**, and **scalability bottlenecks** that would fail to support a high-volume Fortune 500 SaaS platform.

This review details these issues and provides structural design corrections that must be applied to the schema *before* any migration scripts are executed.

---

## 1. Critical Multi-Tenant Security Vulnerabilities (RLS Violations)

### The Issue: Tenant Key Omission on Child Tables
A primary rule of multi-tenant Row-Level Security (RLS) in PostgreSQL is that **every single database table** subject to tenant scoping *must* contain the tenant identifier (`organization_id`). 

In the current schema, several critical child tables omit the `organization_id` column, relying on parent joins for isolation:
* `quote_line_items` (references `quotations` but lacks `organization_id`)
* `invoice_line_items` (references `invoices` but lacks `organization_id`)
* `project_allocations` (references `projects` but lacks `organization_id`)
* `ticket_messages` (references `support_tickets` but lacks `organization_id`)
* `task_dependencies` (references `tasks` but lacks `organization_id`)

### The Impact
If a developer writes a query that executes a select or join directly on `invoice_line_items` or `ticket_messages` without manually joining the parent table, **the RLS boundary is completely bypassed**. In a multi-tenant environment, this is a critical data leakage hazard.

### The Correction
Every child, join, and log table (except for shared global tables like `roles` and `permissions`) must contain `organization_id UUID NOT NULL` and be included in the RLS policy schema:
```sql
ALTER TABLE invoice_line_items ADD COLUMN organization_id UUID NOT NULL REFERENCES organizations(id);
```

---

## 2. Scalability Bottlenecks & Performance Concerns

### 2.1 UUID v4 Index Bloat and Write Performance Degradation
* **The Weakness**: The design standardizes on UUID v4 (`gen_random_uuid()`) for all primary keys.
* **The Problem**: UUID v4 values are completely random. When inserting millions of rows into heavily indexed tables (such as `timesheets`, `tasks`, and `audit_logs`), random keys result in random page writes within the B-tree indexes. This causes frequent **B-tree page splits**, cache thrashing (as pages must be continuously pulled from disk into RAM), and index fragmentation.
* **The Correction**: Standardize on **UUID v7** (standardized in RFC 9562). UUID v7 embeds a millisecond-precision timestamp at the beginning of the 128-bit value. This makes the keys sequentially ordered (monotonically increasing) while preserving uniqueness, ensuring that index inserts always append to the rightmost leaf node of the B-tree, significantly reducing disk I/O and CPU overhead.

### 2.2 PostgreSQL Partitioning Foreign Key Constraints
* **The Weakness**: The design proposes range partitioning on the `created_at` timestamp for `audit_logs` and `timesheets`.
* **The Problem**: In PostgreSQL, a partitioned table cannot be referenced by a foreign key from another table *unless* the referencing table’s foreign key includes the partition key column. 
  * Because `timesheets` is partitioned by `date` or `created_at`, the table `invoice_line_items` cannot have a foreign key pointing to `timesheets(id)` alone; it must point to a composite key `timesheets(id, date)`, forcing `invoice_line_items` to also store and index `date` or `created_at` columns.
* **The Correction**: 
  * Remove foreign keys pointing from transaction tables directly to partitioned tables, replacing them with application-validated references, or
  * Co-partition the tables (e.g., partition both `timesheets` and `invoice_line_items` by the same range keys).

### 2.3 RLS Performance Overhead at Scale
* **The Weakness**: RLS executes an expression check on every single index scan by evaluating `current_setting('app.current_organization_id')`.
* **The Problem**: Under high-throughput workloads, this execution adds CPU overhead. If Postgres cannot inline the security function, it may choose slow sequential scans over index scans.
* **The Correction**: Set the `organization_id` filter explicitly in the application query builder alongside RLS. Treat RLS as a secondary safety net rather than the sole querying mechanism.

---

## 3. Database Schema Integrity & Design Gaps

### 3.1 Uniqueness Collisions in Soft-Deleted Records
* **The Weakness**: The `organizations` table defines `subdomain VARCHAR(100) NOT NULL UNIQUE`.
* **The Problem**: If Tenant A (`subdomain: 'dgo'`) is soft-deleted, their record remains in the database with `deleted_at` set. If a new tenant attempts to sign up with the subdomain `'dgo'`, the database constraint will trigger a unique key collision, preventing sign-up even though the old tenant is inactive.
* **The Correction**: Remove the direct `UNIQUE` constraint from the table definition and replace it with a partial unique index:
```sql
CREATE UNIQUE INDEX idx_organization_subdomain_active 
ON organizations(subdomain) 
WHERE deleted_at IS NULL;
```
Apply this correction to all tables using unique keys (such as `invoices(invoice_number)`, `roles(name)`, and `permissions(code)`).

### 3.2 Security Vulnerability: Plaintext MFA Secret Storage
* **The Weakness**: The `users` table stores `mfa_secret` as plain `VARCHAR(255)`.
* **The Problem**: If an attacker gains read access to the database (via SQL injection or a leaked backup), they can compromise all users' MFA codes, rendering 2FA useless.
* **The Correction**: Encrypt `mfa_secret` at the application layer before database insertion using AES-256, or utilize PostgreSQL's `pgcrypto` extension to store encrypted values:
```sql
-- Store MFA secrets using pgp_sym_encrypt
ALTER TABLE users ALTER COLUMN mfa_secret TYPE BYTEA;
```

### 3.3 Passkey (WebAuthn) Support Conflict
* **The Weakness**: In `users`, `password_hash VARCHAR(255) NOT NULL` is mandatory.
* **The Problem**: Modern enterprise systems must support passwordless authentication (Passkeys, OAuth2, Magic Links). Requiring a password hash forces the application to write dummy hashes for passwordless users, introducing security risks and code complexity.
* **The Correction**: Make `password_hash` nullable (`VARCHAR(255) NULL`) and add a table check constraint to ensure users have either a password hash or an active OAuth/WebAuthn credential key.

---

## 4. Missing Database Entities (Gaps in Master Data)

To support a production-grade SaaS CRM, the following tables are missing and must be added to the schema:

### 4.1 Master Catalog tables
* **`products` / `price_books`**: Needed to manage standard DGO service fees, software licenses, or support contracts. Currently, sales reps must enter pricing manually, leading to data entry errors.
* **`exchange_rates`**: To support multi-currency contracts and opportunities. The system requires an exchange rate log to run currency conversions (e.g., converting SEPA Euros to USD on reports).

### 4.2 Onboarding Checklists
* **`onboarding_templates` / `template_tasks`**: Required to configure standard task checklists for different delivery types (e.g., Staff Augmentation vs. Dedicated Pod). Hardcoding these checklists in application code prevents PMs from modifying them.

### 4.3 Tracking History & Revisions
* **`document_versions`**: The current schema stores only a single URL in `documents`. Documents in outsourcing contracts undergo multiple revisions, requiring a dedicated version table tracking who uploaded what and when.
* **`timesheet_audit_logs`**: Timesheets undergo corrections and rejections. Storing only a `status` field removes the history of comments, rejections, and changes, which violates compliance audits.

---

## 5. Summary of Recommended Schema Improvements

| Target Table | Identified Gap / Weakness | Recommended Database Action |
| :--- | :--- | :--- |
| **All tables** | UUID v4 write overhead & index bloat | Transition primary keys to **UUID v7** (time-ordered). |
| **Child tables** | Missing `organization_id` (RLS bypass) | Add `organization_id` to all child tables; include in RLS policies. |
| `organizations` | Unique subdomain collision on soft delete | Drop UNIQUE constraint; build partial index `WHERE deleted_at IS NULL`. |
| `users` | Unencrypted MFA secrets | Transition type to `BYTEA` and apply `pgp_sym_encrypt` or encrypt at app-layer. |
| `users` | Non-nullable password hash blocks passkeys | Alter `password_hash` to `NULL`; enforce credential validation via check constraint. |
| `audit_logs` | Partition constraint collision | Adjust PK to `(id, created_at)` to support PostgreSQL partitioning bounds. |
| *New Entity* | Missing product catalog | Create `products` and `price_books` directories. |
| *New Entity* | Missing multi-currency support | Create `exchange_rates` lookup table. |
| *New Entity* | Missing onboarding scaffolding templates | Create `project_templates` and `template_tasks` tables. |
| *New Entity* | Missing timesheet lifecycle track | Create `timesheet_revisions` log table. |

---

## 6. Architectural Review Verdict
The database schema has a solid relational structure but requires remediation of the RLS tenant key omissions and index optimization strategies before being deployed to production. Applying these adjustments will ensure the database is secure, performant, and scale-ready for enterprise operations.
