export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

export type ErrorStatus = 'unresolved' | 'resolved' | 'ignored';

export interface ErrorLogEntry {
  id: string;
  createdAt: string;
  severity: ErrorSeverity;
  source: string;
  module: string;
  operation: string;
  taskId?: string | null;
  errorCode: string;
  userMessage: string;
  technicalDetails?: string | null;
  sanitizedStack?: string | null;
  status: ErrorStatus;
  appVersion: string;
  resolvedAt?: string | null;
}

export interface ErrorLogFilter {
  severity?: string | null;
  module?: string | null;
  status?: string | null;
  period?: string | null;
  search?: string | null;
  limit?: number | null;
  offset?: number | null;
}

export interface ErrorLogStats {
  total: number;
  critical: number;
  unresolved: number;
  databaseSizeBytes: number;
}

export interface CreateErrorLogPayload {
  severity?: string | null;
  source?: string | null;
  module: string;
  operation: string;
  taskId?: string | null;
  errorCode: string;
  userMessage: string;
  technicalDetails?: string | null;
  sanitizedStack?: string | null;
}
