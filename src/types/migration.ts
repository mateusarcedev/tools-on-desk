export type MigrationStep =
  | 'DISCOVERY'
  | 'PREFLIGHT'
  | 'BACKUP'
  | 'COPY'
  | 'DATABASE_MIGRATION'
  | 'PATH_RECONCILIATION'
  | 'CREDENTIAL_MIGRATION'
  | 'VALIDATION'
  | 'COMMIT'
  | 'COMPLETED'
  | 'BLOCKED'
  | 'FAILED'
  | 'RECOVERY_REQUIRED'
  | 'ROLLED_BACK';

export interface MigrationStatus {
  hasLegacyData: boolean;
  isMigrated: boolean;
  currentStep: MigrationStep;
  message: string;
  progressPercent: number;
  backupManifestPath?: string;
  preservedProjectsCount: number;
  preservedAssetsCount: number;
  preservedTasksCount: number;
  preservedHistoryCount: number;
  preservedErrorLogsCount: number;
  credentialsMigrated: boolean;
  binariesReused: boolean;
}

export interface MigrationProgressEvent {
  step: MigrationStep;
  stepName: string;
  message: string;
  percent: number;
}
