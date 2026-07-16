# DGO CRM Enterprise Software Design Document
## Master Table of Contents

This document outlines the multi-volume master table of contents for the Decent Global Outsourcing (DGO) Enterprise CRM Software Design Document (SDD). The total specification covers over 300 pages of detailed technical layout, domain modeling, and deployment architectures.

---

## Volume I: Enterprise Foundation & System Architecture

### Chapter 1: Document Control & Executive Summary
- 1.1 Document Revision Ledger & Version Control
- 1.2 Target Audience Guidance (Developers, QA, DevOps, Project Managers)
- 1.3 Executive Project Charter & Scope Boundary
- 1.4 Architectural Philosophy & Clean Architecture Invariants
- 1.5 Domain-Driven Design (DDD) Strategy and Strategic Context Maps
- 1.6 Technology Stack Rationale (NestJS, Next.js, PostgreSQL, Prisma, TailwindCSS)

### Chapter 2: Global Architecture Standards & Patterns
- 2.1 Multi-Tenant Isolation Models (Database vs Schema vs Row Level)
- 2.2 Domain Entities, Value Objects, Aggregates, and Domain Events Core Patterns
- 2.3 Command Query Responsibility Segregation (CQRS) Architecture
- 2.4 Event-Driven Orchestration & Outbox Pattern Implementations
- 2.5 REST API Standardization & Versioning Controls (`/api/v1/` Rules)
- 2.6 Global Error Handling Matrix & Exception Envelope Enforcers
- 2.7 Frontend State Architecture & Server/Client Components Decoupling

---

## Volume II: Identity, Security, & Access Governance

### Chapter 3: Identity & Access Management (Authentication)
- 3.1 Session Architecture & Token Lifetime Governance
- 3.2 Stateless JWT Layout & Custom Payload Claims
- 3.3 Refresh Token Rotation (RTR) & Database Token Family Registry
- 3.4 Multi-Factor Authentication (MFA) via TOTP & SMS Gates
- 3.5 Single Sign-On (SSO) Integration (Azure Active Directory, Okta, SAML 2.0)
- 3.6 Account Lockout Invariants & Rate Limiting Schemes
- 3.7 Passkey & Passwordless Authentication Architecture (WebAuthn)
- 3.8 Cryptographic Secret Management & Key Rotation Pipelines

### Chapter 4: User Directory (Users)
- 4.1 Multi-Tenant User Profiles & Account Lifecycles
- 4.2 Invitation-Based User Provisioning & Sign-up Validation Flows
- 4.3 Profile Management, Localization, and Regional Parameter Preferences
- 4.4 User Active Session Monitoring & Remote Session Revocation Engine

### Chapter 5: Role-Based Access Control & Permissions (Roles & Permissions)
- 5.1 RBAC Schema Design: Roles, Permissions, and User Assignments
- 5.2 Functional Permissions vs. Record-Level Data Scope Restrictions
- 5.3 Dynamic Privilege Matrix Management & Hierarchy Resolution
- 5.4 High-Risk Actions Authorization Guard Rails (Dual-Control Sign-off)

### Chapter 6: Departmental & Structural Governance (Departments)
- 6.1 Enterprise Department Tree & Divisional Parent-Child Structures
- 6.2 Resource Allocation to Departments
- 6.3 Departmental Data Boundaries & Information Access Controls
- 6.4 Intra-Departmental Team Routing & Work Queues

### Chapter 7: Security Audits & Tracking (Audit Logs)
- 7.1 Immutable Security Logs and Temporal Auditing Schemas
- 7.2 Security Event Classification: Authentication, Authorization, Configuration Change
- 7.3 Tamper-Proof Storage & Logs Rotation Policy (PostgreSQL to CloudWatch/S3)
- 7.4 Security Information and Event Management (SIEM) Ingestion Protocols

---

## Volume III: B2B Relationship & Opportunity Management

### Chapter 8: Lead Ingestion & Qualification Pipeline (Leads)
- 8.1 Multi-Channel Lead Ingestion API & Webhook Adapters
- 8.2 Lead Deduplication Algorithm (Email, Domain, and Phone Match Metrics)
- 8.3 Inbound Lead Auto-Scoring Engine
- 8.4 Assignment Rules: Round-Robin, Geographic, and Budget-Tier Routing
- 8.5 Lead Stage Lifecycles (`NEW` ➔ `CONTACTED` ➔ `QUALIFIED` ➔ `NURTURING` ➔ `UNQUALIFIED`)
- 8.6 Lead Conversion Transaction: Atomic Account, Contact, and Opportunity Creation

### Chapter 9: B2B Accounts Directory (Clients)
- 9.1 Corporate Account Structure (Parent-Subsidiary Multi-Tier Trees)
- 9.2 Firmographic Parameters (Industry, Employee Count, Revenue Tier)
- 9.3 Subsidiary Metric Roll-up Aggregator (Financial, Opportunity, SLA health)
- 9.4 Account Inactivation Policies & Customer Archiving Lifecycle

### Chapter 10: Stakeholder Directory (Contacts)
- 10.1 Multi-Contact Profiles Linked to Corporate Accounts
- 10.2 Contact Authority Metrics: Decision Maker, Influencer, Gatekeeper, User
- 10.3 Primary Billing & Technical Contact Validation Hooks
- 10.4 Consent Management & Marketing Preferences Registry (GDPR/CCPA Compliance)

### Chapter 11: Deal Pipeline & Forecasting (Deals)
- 11.1 Sales Funnel Stages: Discovery, Proposal, Negotiation, Closed-Won, Closed-Lost
- 11.2 Probability Weights & Forecast Revenue Computations (Weighted Pipelines)
- 11.3 Multi-Currency Opportunity Valuation & Daily Rates Registry
- 11.4 Competitor Intelligence Log & Key Buying Factor Parameters
- 11.5 Lost Opportunity Post-Mortem Logging & Analytics Criteria

### Chapter 12: Pricing Models & Proposal Management (Quotations)
- 12.1 Dynamic Quotation Builder: Unit Rates, Hourly Cards, Line Item Margins
- 12.2 PDF Generation Engine & Document Version Layouts
- 12.3 Internal Quotation Discount Thresholds & Approval Rules
- 12.4 Client Digital Acceptance Portal & Sign-off Audits

### Chapter 13: Statement of Work & Legal Agreements (Contracts)
- 13.1 Contract Lifecycle Management (Draft ➔ Review ➔ Active ➔ Renewed ➔ Terminated)
- 13.2 Statement of Work (SOW) Standard Templates Mapping
- 13.3 Digital Document Signature Integration (DocuSign/Adobe Sign API)
- 13.4 Contract Amendment Registry & Historic Document Archives

---

## Volume IV: Project Delivery, Resource Tracking, & Operations

### Chapter 14: Project Delivery Systems (Projects)
- 14.1 Onboarding Project Scaffolding from Opportunity Won Triggers
- 14.2 Service Delivery Types: Staff Augmentation, Dedicated Pods, Fixed Milestones
- 14.3 Project Health Check Metrics & SLA Alignment Trackers
- 14.4 Delivery Team Assignment Matrices

### Chapter 15: Operational Task Management (Tasks)
- 15.1 Real-Time Kanban Board & Sprint Planning Engines
- 15.2 Task Dependencies, Critical Path Renderings, and Subtasks
- 15.3 Time Allocation Estimation vs Actual Burn Downs
- 15.4 Task Status Transition Controls & Custom Validation Constraints

### Chapter 16: Milestone Delivery Records (Milestones)
- 16.1 Phase Tracking & Phase Gate Approvals
- 16.2 Revenue Recognition Milestones & Billing Triggers
- 16.3 Client Sign-Off Handshake Protocols
- 16.4 Milestone Slippage Warning Systems

### Chapter 17: Operational Calendar Sync (Calendar)
- 17.1 Shared Team Workspaces & Resource Availability Schedules
- 17.2 Two-Way Sync Integration (Google Calendar API, Outlook Calendar API)
- 17.3 Onboarding Target Date Overlays & Milestone Reminders
- 17.4 Meeting Room Reservations & Virtual Room Auto-Provisioning

### Chapter 18: File Management System (Documents)
- 18.1 Secure Cloud Storage Architecture (S3 Bucket Integration)
- 18.2 Document Access Control Schemes & Organizational Folder Trees
- 18.3 Document OCR Analysis, Metadata Indexing, and Search Retrieval
- 18.4 Cryptographic File Integrity Verification & Antivirus Scanners

---

## Volume V: Financial Operations & Billing Engine

### Chapter 19: Invoice Generation (Invoices)
- 19.1 Automated Timesheet Aggregation & Hourly Billing Computations
- 19.2 Retainer Contracts & Recurring Invoicing Cycles
- 19.3 Draft Review, Validation, Adjustment, and PM Approval Stepper
- 19.4 PDF Layout Renderers & Multiple Localization Rules
- 19.5 Tax Engines (Avalara/Stripe Tax API) & VAT Rules Registry

### Chapter 20: Payment Gateway (Payments)
- 20.1 Stripe ACH, Credit Card, and SEPA Processing Pipelines
- 20.2 Subscription Management & Billing Recurrence Engines
- 20.3 Payment Webhook Ingestion & Idempotent Transaction Records
- 20.4 Dunning Schedules & Credit Recovery Protocols
- 20.5 Ledger Transactions, Credit Memos, and Refund Allocations

### Chapter 21: Expense Management (Expenses)
- 21.1 Project Expense Reimbursements Logging & Category Tags
- 21.2 Employee Receipt Uploads & OCR Extraction Processing
- 21.3 Expense Multi-Level Approvals Stepper
- 21.4 Billable vs Non-Billable Expense Allocations to Accounts

---

## Volume VI: Client Portal & Engagement Hub

### Chapter 22: Service Desk & Ticketing (Support Tickets)
- 22.1 Support Ticket Lifecycles: Open, In Progress, Pending Client, Resolved
- 22.2 Ticket Priority Level Matrix & SLA Response Resolution Clocks
- 22.3 Omnichannel Ticket Logging (Web Portal, Email to Ticket, API)
- 22.4 Automatic Ticket Routing Rules Based on Topic & Team Skills
- 22.5 Customer Satisfaction Score (CSAT) Survey Dispatchers

### Chapter 23: Messaging Engine (Notifications)
- 23.1 In-App Notification Hub & Real-time WebSockets Pushes
- 23.2 Email Notification Dispatches & Template Customizers
- 23.3 SMS Outbound Adapters (Twilio Integration)
- 23.4 System-wide Broadcast Manager & Operations Bulletin Boards
- 23.5 User Notification Notification Frequency Controllers

### Chapter 24: Secure Client Portal (Client Portal)
- 24.1 Dynamic External Authentication Tokens & Magic Security Links
- 24.2 Client Workspace Layout: Project Checklists, Invoices, Tickets, Tasks
- 24.3 Client Document Approvals, CV Vetting, and Sign-off Wizards
- 24.4 Branding, Color Schemes, and Client Portal White-label Customizations

### Chapter 25: Operational Workspace (Dashboard)
- 25.1 Dynamic Widgets Engine & Custom User Layout Configurations
- 25.2 Sales Pipeline Widgets & Conversion Probability Charts
- 25.3 Project Delivery Progress Widgets & SLA Status Alerts
- 25.4 Operations Overview (MRR, Receivables, Staff Utilizations)
- 25.5 Real-Time Operational Alerts Feed

---

## Volume VII: Analytics, Settings, & Monitoring

### Chapter 26: Analytics Engine & Business Intelligence (Reports)
- 26.1 Financial Intelligence Reports: ARR, MRR, Collections, Outstanding Bad Debt
- 26.2 Operations Reports: Resource Allocations, Billing Utilizations, Timesheet Submissions
- 26.3 Sales Reports: Lead Conversion, Velocity, Win/Loss Ratio, Forecast Overviews
- 26.4 Customizable Report Builders & Automated SQL Queries
- 26.5 Data Export Infrastructure (CSV, Excel, PDF, JSON formats)

### Chapter 27: System Configurations (Settings)
- 27.1 CRM Global Configurations & Localization Matrices (Dates, Currencies, Time zones)
- 27.2 Custom Field Management & Dynamic Schema Mappings
- 27.3 System Integrations Settings (API Keys, Stripe Credentials, Mail Adapters)
- 27.4 System Backup Schedules & Organization Configurations

### Chapter 28: Diagnostic Systems & Application Performance Monitoring (Monitoring)
- 28.1 Backend Diagnostics APM (OpenTelemetry, Prometheus, Grafana)
- 28.2 Frontend Crash Reporting & Session Replays (Sentry, LogRocket)
- 28.3 Health Status Page & Heartbeat Monitors (Pingdom, UptimeRobot)
- 28.4 CPU, RAM, and Database Connection Pool Monitoring Systems

---

## Volume VIII: Database Architecture & Core API Contracts

### Chapter 29: Database Engine & Relational Schema (Database)
- 29.1 PostgreSQL Global Relational Schema
- 29.2 Schema Indexes & Query Optimizations (Partitioning, B-Trees, GiST)
- 29.3 Soft Deletion & Entity Restoration Policies
- 29.4 PostgreSQL Transaction Management & Row Lock Invariants
- 29.5 Data Migration Pipelines & Prisma Migration Scripts

### Chapter 30: System API Integration Blueprint (API Documentation)
- 30.1 OpenAPI/Swagger Configuration Core Standards
- 30.2 API Gateway Inbound Rate Limiting & Access Rules
- 30.3 Inbound Payload Structuring (JSON Schemas, DTO Validators)
- 30.4 Standard Response Envelope Layouts
- 30.5 Webhook Dispatch Registry & Event Payloads Spec Sheet

### Chapter 31: Testing Strategy (Testing)
- 31.1 Unit Testing Framework (Jest): Mocking Domain & Application Services
- 31.2 Integration Testing Strategy: Prisma In-Memory Databases Testing
- 31.3 End-to-End Testing (Playwright/Cypress): Interface Flow Audits
- 31.4 Performance Testing: Load Testing (k6) & Database Stress Checks
- 31.5 Automated CI/CD Pipeline Code Coverage Thresholds

---

## Volume IX: DevOps, Deployment, Security Governance, & Roadmap

### Chapter 32: CI/CD Pipeline (DevOps)
- 32.1 GitHub Actions Pipelines Configuration
- 32.2 Docker Image Building, Versioning, and Registry Storage (ECR/GCR)
- 32.3 Database Migration Auto-execution during Deployment Runs
- 32.4 Automated Static Application Security Testing (SAST) & Lint Runs

### Chapter 33: Multi-Cloud Deployment Patterns (Deployment)
- 33.1 AWS ECS Fargate Infrastructure Layouts
- 33.2 Kubernetes Deployment Orchestrations (Helm Charts, Namespace Isolations)
- 33.3 High Availability (HA) Load Balancing (AWS ALB, NGINX Ingress)
- 33.4 Serverless Functions & Edge Network Delivery configurations (Vercel)

### Chapter 34: Cybersecurity Policies & Compliance (Security)
- 34.1 OWASP Top 10 Safeguard Matrices
- 34.2 Data Encryption Rules: AES-256 for DB Storage, TLS 1.3 for Transit
- 34.3 Vulnerability Scan Routines & Automated Dependency Audits (Snyk/Dependabot)
- 34.4 SOC2 Compliance Audit Metrics & System Control Mapping

### Chapter 35: Growth & Architectural Evolution (Future Roadmap)
- 35.1 Artificial Intelligence Lead Qualification Enforcers
- 35.2 Automated Sandbox VM Provisioning for Outsourcing Deliveries
- 35.3 Blockchain Settlement & Cryptographic Contract Attestation Channels
- 35.4 Multi-Org Cross-Tenant Analytics & Global HR Integrations
