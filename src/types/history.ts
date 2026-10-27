import { TaskModule } from './task';

export interface HistoryItem {
  id: string;
  name: string;
  op: string;
  mod: TaskModule | string;
  status: 'Concluído' | 'Erro' | 'Cancelado';
  date: string;
  size: string;
  filePath?: string;
  error?: string | null;
}
