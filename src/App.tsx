import React, { useEffect, useState } from 'react';
import { ScreenId } from './types/navigation';
import { Task } from './types/task';
import { HistoryItem } from './types/history';
import { AppSettings, ThemePreference } from './types/settings';
import { TauriService } from './services/tauri';

import { TitleBar } from './components/shell/TitleBar';
import { Sidebar } from './components/shell/Sidebar';
import { CommandPalette } from './components/shell/CommandPalette';
import { TaskDrawer } from './components/shell/TaskDrawer';
import { StatusBar } from './components/shell/StatusBar';
import { ToastContainer, ToastItem } from './components/shell/ToastContainer';

import { HomeScreen } from './components/screens/HomeScreen';
import { CreativeStudioScreen } from './components/screens/creative/CreativeStudioScreen';
import { DownloadsScreen } from './components/screens/DownloadsScreen';
import { DocumentsScreen } from './components/screens/DocumentsScreen';
import { AudioScreen } from './components/screens/AudioScreen';
import { VideoScreen } from './components/screens/VideoScreen';
import { ImagesScreen } from './components/screens/ImagesScreen';
import { PosterStudioScreen } from './components/screens/PosterStudioScreen';
import { HistoryScreen } from './components/screens/HistoryScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { SetupCenterModal } from './components/setup/SetupCenterModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<ScreenId>('home');
  const [collapsed, setCollapsed] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [setupCenterOpen, setSetupCenterOpen] = useState(false);

  const [historyTab, setHistoryTab] = useState<'activities' | 'diagnostics'>('activities');
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null);

  const [themePref, setThemePref] = useState<ThemePreference>('Escuro');
  const [sysDark, setSysDark] = useState(true);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [settings, setSettings] = useState<AppSettings>({
    themePref: 'Escuro',
    maxConcurrency: 2,
    downloadFolder: 'C:\\Users\\Mateus\\Downloads\\Arce Tools',
    exportFolder: 'C:\\Users\\Mateus\\Documents\\Arce Tools\\Exportados',
    notifications: true,
    autoUpdate: true,
    saveInSameFolder: false,
    language: 'Português (Brasil)',
  });

  const showToast = (text: string, kind: 'ok' | 'err' | 'warn' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-4), { id, text, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  };

  const isDarkMode =
    themePref === 'Escuro' || (themePref === 'Sistema' && sysDark);

  const cycleTheme = () => {
    const next: ThemePreference = isDarkMode ? 'Claro' : 'Escuro';
    setThemePref(next);
    TauriService.setPreference('theme', next);
  };

  const loadData = async () => {
    try {
      const [loadedTasks, loadedHistory, sysInfo, savedTheme, firstRun] = await Promise.all([
        TauriService.getTasks(),
        TauriService.getHistory(),
        TauriService.getSystemInfo(),
        TauriService.getPreference('theme'),
        TauriService.getFirstRunStatus(),
      ]);

      setTasks(loadedTasks);
      setHistory(loadedHistory);

      if (savedTheme) {
        setThemePref(savedTheme as ThemePreference);
      }

      if (firstRun.isFirstRun || (!firstRun.completed && !firstRun.dismissed && !firstRun.allEssentialReady)) {
        setSetupCenterOpen(true);
      }

      setSettings((prev) => ({
        ...prev,
        downloadFolder: sysInfo.defaultDownloadFolder,
        exportFolder: sysInfo.defaultExportFolder,
      }));
    } catch (err) {
      console.warn('Initial data load in mock / browser environment:', err);
    }
  };

  useEffect(() => {
    loadData();

    // System dark mode listener
    try {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      setSysDark(mq.matches);
      const handler = (e: MediaQueryListEvent) => setSysDark(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } catch {
      // fallback
    }
  }, []);

  // Global Frontend Error Logging
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || String(event.reason);
      TauriService.logFrontendError({
        severity: 'error',
        source: 'unhandled_promise_rejection',
        module: 'ui',
        operation: 'async_event',
        errorCode: 'UNHANDLED_PROMISE',
        userMessage: 'Ocorreu um erro assíncrono interno na interface.',
        technicalDetails: msg,
        sanitizedStack: event.reason?.stack,
      }).catch(() => {});
    };

    const handleWindowError = (event: ErrorEvent) => {
      TauriService.logFrontendError({
        severity: 'error',
        source: 'window_error',
        module: 'ui',
        operation: 'script_execution',
        errorCode: 'WINDOW_SCRIPT_ERROR',
        userMessage: event.message || 'Erro inesperado na aplicação.',
        technicalDetails: `${event.filename}:${event.lineno}:${event.colno}`,
        sanitizedStack: event.error?.stack,
      }).catch(() => {});
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleWindowError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleWindowError);
    };
  }, []);

  // Listen to Tauri events for background task engine
  useEffect(() => {
    const unlisten1 = TauriService.onTaskCreated((task) => {
      setTasks((prev) => [task, ...prev.filter((t) => t.id !== task.id)]);
    });

    const unlisten2 = TauriService.onTaskProgress(({ id, progress }) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, progress } : t))
      );
    });

    const unlisten3 = TauriService.onTaskStatusChanged((payload) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === payload.id
            ? {
                ...t,
                status: payload.status as any,
                progress: payload.progress ?? t.progress,
                error: payload.error ?? t.error,
              }
            : t
        )
      );
    });

    const unlisten4 = TauriService.onTaskCompleted(({ id }) => {
      loadData();
      const task = tasks.find((t) => t.id === id);
      if (task) {
        showToast(`Concluído: ${task.name}`);
      }
    });

    return () => {
      unlisten1();
      unlisten2();
      unlisten3();
      unlisten4();
    };
  }, [tasks]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Ctrl + K: Palette
      if (mod && key === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
        return;
      }

      // Escape closes modals
      if (e.key === 'Escape') {
        if (paletteOpen) {
          setPaletteOpen(false);
          return;
        }
        if (tasksOpen) {
          setTasksOpen(false);
          return;
        }
      }

      // Ctrl + J: Task Drawer
      if (mod && key === 'j') {
        e.preventDefault();
        setTasksOpen((prev) => !prev);
        return;
      }

      // Ctrl + B: Sidebar toggle
      if (mod && key === 'b') {
        e.preventDefault();
        setCollapsed((prev) => !prev);
        return;
      }

      // Ctrl + 1..9: Direct screen navigation
      if (mod && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const screenMap: ScreenId[] = [
          'home',
          'downloads',
          'documents',
          'audio',
          'video',
          'images',
          'posters',
          'history',
          'settings',
        ];
        const target = screenMap[parseInt(e.key, 10) - 1];
        if (target) setScreen(target);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paletteOpen, tasksOpen]);

  const handleOpenExplorer = async (path?: string) => {
    if (!path) return;
    try {
      await TauriService.openPathInExplorer(path);
    } catch (err: any) {
      showToast(`Erro ao abrir: ${err}`, 'err');
    }
  };

  const handleHomeFilesDropped = (files: FileList | File[]) => {
    const first = files[0];
    if (!first) return;

    if (/\.(jpe?g|png|webp|avif)$/i.test(first.name)) {
      setScreen('images');
      showToast(`${files.length} imagem(ns) aberta(s) no módulo de imagens`);
    } else if (/\.(pdf|docx?|odt)$/i.test(first.name)) {
      setScreen('documents');
      showToast(`${files.length} documento(s) aberto(s) no módulo de documentos`);
    } else if (/\.(mp3|wav|flac|m4a|ogg)$/i.test(first.name)) {
      setScreen('audio');
      showToast(`${files.length} áudio(s) aberto(s) no módulo de áudio`);
    } else if (/\.(mp4|mov|mkv|webm)$/i.test(first.name)) {
      setScreen('video');
      showToast(`${files.length} vídeo(s) aberto(s) no módulo de vídeo`);
    } else {
      showToast('Formato de arquivo identificado e pronto para processamento');
    }
  };

  return (
    <div
      data-theme={isDarkMode ? 'dark' : 'light'}
      style={{
        height: '100vh',
        width: '100vw',
        minHeight: 720,
        minWidth: 1024,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--sans)',
        fontSize: '13px',
        lineHeight: 1.45,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <TitleBar
        tasks={tasks}
        tasksOpen={tasksOpen}
        onToggleTasks={() => setTasksOpen((prev) => !prev)}
        onOpenPalette={() => setPaletteOpen(true)}
        theme={isDarkMode ? 'dark' : 'light'}
        onCycleTheme={cycleTheme}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <Sidebar
          currentScreen={screen}
          onNavigate={(s) => setScreen(s)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
        />

        <main
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--bg)',
          }}
        >
          <ErrorBoundary>
            {screen === 'home' && (
              <HomeScreen
                onNavigate={setScreen}
                tasks={tasks}
                history={history}
                onFilesDropped={handleHomeFilesDropped}
                onOpenExplorer={handleOpenExplorer}
              />
            )}

            {screen === 'creative' && <CreativeStudioScreen />}

            {screen === 'downloads' && (
              <DownloadsScreen onShowToast={showToast} />
            )}

            {screen === 'documents' && (
              <DocumentsScreen onShowToast={showToast} />
            )}

            {screen === 'audio' && <AudioScreen onShowToast={showToast} />}

            {screen === 'video' && <VideoScreen onShowToast={showToast} />}

            {screen === 'images' && (
              <ImagesScreen
                onShowToast={showToast}
                onOpenExplorer={handleOpenExplorer}
              />
            )}

            {screen === 'posters' && (
              <PosterStudioScreen
                onShowToast={showToast}
                onOpenExplorer={handleOpenExplorer}
              />
            )}

            {screen === 'history' && (
              <HistoryScreen
                history={history}
                onRefreshHistory={loadData}
                onOpenExplorer={handleOpenExplorer}
                onShowToast={showToast}
                initialTab={historyTab}
                highlightTaskId={highlightTaskId}
              />
            )}

            {screen === 'settings' && (
              <SettingsScreen
                settings={{ ...settings, themePref }}
                onUpdateSettings={(patch) => {
                  setSettings((prev) => ({ ...prev, ...patch }));
                  if (patch.themePref) setThemePref(patch.themePref);
                }}
                onShowToast={showToast}
                onOpenSetupCenter={() => setSetupCenterOpen(true)}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>

      <StatusBar tasks={tasks} />

      <TaskDrawer
        isOpen={tasksOpen}
        onClose={() => setTasksOpen(false)}
        tasks={tasks}
        onTaskUpdated={loadData}
        onShowToast={showToast}
        onNavigateToError={(taskId) => {
          setHistoryTab('diagnostics');
          setHighlightTaskId(taskId);
          setScreen('history');
        }}
      />

      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={setScreen}
        onToggleTasks={() => setTasksOpen(true)}
        onCycleTheme={cycleTheme}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        onOpenSetupCenter={() => setSetupCenterOpen(true)}
      />

      <SetupCenterModal
        isOpen={setupCenterOpen}
        onClose={() => setSetupCenterOpen(false)}
        onFinished={() => {
          setSetupCenterOpen(false);
          loadData();
        }}
        onShowToast={showToast}
      />

      <ToastContainer toasts={toasts} />
    </div>
  );
};

export default App;
