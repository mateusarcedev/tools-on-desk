export type TaskStatus = 'waiting' | 'processing' | 'done' | 'failed' | 'canceled';

export type TaskModule =
  | 'downloads'
  | 'documents'
  | 'audio'
  | 'video'
  | 'images'
  | 'posters';

export interface Task {
  id: string;
  name: string;
  op: string;
  mod: TaskModule;
  status: TaskStatus;
  progress: number; // 0.0 to 1.0
  sourcePath?: string;
  targetPath?: string;
  error?: string | null;
  sizeMB?: number;
  speed?: string;
  eta?: string;
  createdAt?: string;
  finishedAt?: string;
}
