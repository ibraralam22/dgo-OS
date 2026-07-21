// Audit Log Action Constants
// Centralized constants for audit log actions to prevent typos and ensure consistency

export const AuditLogAction = {
  // User Management
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_ROLE_CHANGE: 'user.role_change',
  USER_ASSIGN: 'user.assign',
  USER_REMOVE: 'user.remove',

  // Authentication
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_TOKEN_ROTATE: 'auth.token_rotate',
  AUTH_COMPROMISE_DETECTED: 'auth.compromise_detected',
  AUTH_SUPERADMIN_REGISTER: 'auth.superadmin.register',

  // Role Management
  ROLE_CREATE: 'role.create',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete',

  // Account Management
  ACCOUNT_CREATE: 'account.create',
  ACCOUNT_UPDATE: 'account.update',
  ACCOUNT_HIERARCHY_UPDATE: 'account.hierarchy.update',
  ACCOUNT_DELETE: 'account.delete',

  // Contact Management
  CONTACT_CREATE: 'contact.create',
  CONTACT_UPDATE: 'contact.update',
  CONTACT_PRIMARY_BILLING_ASSIGNED: 'contact.primary-billing.assigned',
  CONTACT_DELETE: 'contact.delete',

  // Opportunity Management
  OPPORTUNITY_CREATE: 'opportunity.create',
  OPPORTUNITY_UPDATE: 'opportunity.update',
  OPPORTUNITY_AMOUNT_MODIFIED: 'opportunity.amount_modified',
  OPPORTUNITY_STAGE_CHANGED: 'opportunity.stage_changed',
  OPPORTUNITY_APPROVED: 'opportunity.approved',
  OPPORTUNITY_DELETE: 'opportunity.delete',

  // Session Management
  SESSION_ADMINISTRATIVE_REVOCATION: 'session.administrative_revocation',

  // Settings Management
  SETTINGS_UPDATED: 'settings.updated',

  // Project Management
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_DELETED: 'project.deleted',

  // Ticket Management
  TICKET_CREATED: 'ticket.created',
  TICKET_UPDATED: 'ticket.updated',
  TICKET_DELETED: 'ticket.deleted',
  TICKET_COMMENT_ADDED: 'ticket.comment.added',

  // Invoice Management
  INVOICE_CREATED: 'invoice.created',
  INVOICE_UPDATED: 'invoice.updated',
  INVOICE_DELETED: 'invoice.deleted',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_VOIDED: 'invoice.voided',

  // Payment Management
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_REFUNDED: 'payment.refunded',
  PAYMENT_FAILED: 'payment.failed',

  // Lead Management
  LEAD_CREATED: 'lead.created',
  LEAD_UPDATED: 'lead.updated',
  LEAD_CONVERTED: 'lead.converted',
  LEAD_DEAD: 'lead.dead',

  // Quotation Management
  QUOTATION_CREATED: 'quotation.created',
  QUOTATION_UPDATED: 'quotation.updated',
  QUOTATION_ACCEPTED: 'quotation.accepted',
  QUOTATION_REJECTED: 'quotation.rejected',
  QUOTATION_EXPIRED: 'quotation.expired',

  // Calendar Management
  CALENDAR_EVENT_CREATED: 'calendar_event.created',
  CALENDAR_EVENT_UPDATED: 'calendar_event.updated',
  CALENDAR_EVENT_DELETED: 'calendar_event.deleted',

  // Task Management
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_COMPLETED: 'task.completed',
  TASK_DELETED: 'task.deleted',

  // Reports
  REPORT_GENERATED: 'report.generated',
  REPORT_SAVED: 'report.saved',
  REPORT_DELETED: 'report.deleted',

  // Clients
  CLIENT_CREATED: 'client.created',
  CLIENT_UPDATED: 'client.updated',
  CLIENT_DELETED: 'client.deleted',

  // System/Audit
  SYSTEM_CONFIG_CHANGED: 'system.config.changed',
  SECURITY_ALERT_TRIGGERED: 'security.alert.triggered',
  DATA_EXPORT_INITIATED: 'data.export.initiated',
  DATA_IMPORT_COMPLETED: 'data.import.completed',
};

// Helper function to get all action values for validation
export const getAllAuditLogActions = (): string[] => {
  return Object.values(AuditLogAction);
};

// Helper function to validate if an action is valid
export const isValidAuditLogAction = (action: string): boolean => {
  return Object.values(AuditLogAction).includes(action);
};