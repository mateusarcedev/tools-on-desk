import React, { useState, useEffect } from 'react';
import { Icon } from '../common/Icon';
import { Task } from '../../types/task';
import { TauriService } from '../../services/tauri';

interface TitleBarProps {
  tasks: Task[];
  tasksOpen: boolean;
  onToggleTasks: () => void;
  onOpenPalette: () => void;
  theme: 'dark' | 'light';
  onCycleTheme: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  tasks,
  tasksOpen,
  onToggleTasks,
  onOpenPalette,
  theme,
  onCycleTheme,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    TauriService.isWindowMaximized().then(setIsMaximized);
    TauriService.onWindowResize(() => {
      TauriService.isWindowMaximized().then(setIsMaximized);
    }).then((cleanup) => {
      unlisten = cleanup;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    TauriService.minimizeWindow();
  };

  const handleToggleMaximize = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    TauriService.toggleMaximizeWindow();
    TauriService.isWindowMaximized().then(setIsMaximized);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    TauriService.closeWindow();
  };

  const activeTasks = tasks.filter(
    (t) => t.status === 'processing' || t.status === 'waiting'
  );
  const runningTasks = tasks.filter((t) => t.status === 'processing');
  const errorTasks = tasks.filter((t) => t.status === 'failed');

  const overallProgress = activeTasks.length
    ? activeTasks.reduce((acc, t) => acc + (t.progress || 0), 0) /
      activeTasks.length
    : 1;

  const taskLabel = runningTasks.length
    ? `${runningTasks.length} em execução`
    : activeTasks.length
    ? `${activeTasks.length} na fila`
    : errorTasks.length
    ? `${errorTasks.length} com erro`
    : 'Nenhuma tarefa';

  const dotColor = runningTasks.length
    ? 'var(--mint)'
    : errorTasks.length
    ? 'var(--pink)'
    : 'var(--fg-faint)';

  return (
    <div
      data-tauri-drag-region
      onDoubleClick={() => handleToggleMaximize()}
      style={{
        height: 44,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        paddingLeft: 14,
        background: 'var(--bg-soft)',
        borderBottom: '1px solid var(--line)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Brand */}
      <div
        data-tauri-drag-region
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: 180,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: 'var(--mint)',
            color: 'var(--bg)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--mono)',
            fontWeight: 700,
            fontSize: '11px',
            letterSpacing: '-0.04em',
            pointerEvents: 'none',
          }}
        >
          t/d
        </div>
        <span
          style={{
            fontFamily: 'var(--sans)',
            fontWeight: 600,
            fontSize: '13px',
            letterSpacing: '-0.01em',
            pointerEvents: 'none',
          }}
        >
          ToolsOnDesk
        </span>
      </div>

      {/* Global Search / Command Palette trigger */}
      <div
        data-tauri-drag-region
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          minWidth: 0,
        }}
      >
        <button
          onClick={onOpenPalette}
          title="Pesquisar (Ctrl+K)"
          style={{
            width: '100%',
            maxWidth: 460,
            height: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 5px 0 10px',
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            color: 'var(--fg-faint)',
            cursor: 'pointer',
            fontFamily: 'var(--sans)',
            fontSize: '13px',
            transition: 'border-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--fg-dim)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--line)';
          }}
        >
          <Icon name="search" size={15} strokeWidth={1.7} />
          <span
            style={{
              flex: 1,
              textAlign: 'left',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Pesquisar ferramentas e ações
          </span>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '11px',
              padding: '1px 6px',
              border: '1px solid var(--line)',
              borderRadius: 4,
              background: 'var(--surface)',
              color: 'var(--fg-dim)',
            }}
          >
            Ctrl K
          </span>
        </button>
      </div>

      {/* Right Actions: Tasks Indicator, Theme Toggle, Window Controls */}
      <div
        data-tauri-drag-region
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
        }}
      >
        <button
          onClick={onToggleTasks}
          title="Central de tarefas (Ctrl+J)"
          style={{
            height: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 10px',
            borderRadius: 8,
            border: tasksOpen
              ? '1px solid var(--line)'
              : '1px solid transparent',
            background: tasksOpen ? 'var(--surface)' : 'transparent',
            color: 'var(--fg-dim)',
            cursor: 'pointer',
            fontFamily: 'var(--mono)',
            fontSize: '12px',
            transition: 'all 0.15s ease',
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: dotColor,
              animation: runningTasks.length
                ? 'at-pulse 1.6s ease-in-out infinite'
                : 'none',
            }}
          />
          <span>{taskLabel}</span>
          {activeTasks.length > 0 && (
            <span
              style={{
                width: 44,
                height: 3,
                borderRadius: 2,
                background: 'var(--surface-2)',
                overflow: 'hidden',
                display: 'block',
              }}
            >
              <span
                style={{
                  display: 'block',
                  height: '100%',
                  width: `${Math.round(overallProgress * 100)}%`,
                  background: 'var(--mint)',
                  transition: 'width 0.4s ease',
                }}
              />
            </span>
          )}
        </button>

        <button
          onClick={onCycleTheme}
          title="Alternar tema"
          style={{
            width: 30,
            height: 30,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 8,
            border: '1px solid transparent',
            background: 'transparent',
            color: 'var(--fg-dim)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface)';
            e.currentTarget.style.color = 'var(--fg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--fg-dim)';
          }}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
        </button>

        <div
          style={{
            width: 1,
            height: 20,
            background: 'var(--line)',
            margin: '0 4px',
          }}
        />

        {/* Window controls */}
        <div style={{ display: 'flex', height: 44 }}>
          <button
            onClick={handleMinimize}
            title="Minimizar"
            style={{
              width: 46,
              height: 44,
              display: 'grid',
              placeItems: 'center',
              border: 'none',
              background: 'transparent',
              color: 'var(--fg-dim)',
              cursor: 'pointer',
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface)';
              e.currentTarget.style.color = 'var(--fg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--fg-dim)';
            }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
            >
              <path d="M1 6h10" />
            </svg>
          </button>
          <button
            onClick={handleToggleMaximize}
            title={isMaximized ? 'Restaurar' : 'Maximizar'}
            style={{
              width: 46,
              height: 44,
              display: 'grid',
              placeItems: 'center',
              border: 'none',
              background: 'transparent',
              color: 'var(--fg-dim)',
              cursor: 'pointer',
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface)';
              e.currentTarget.style.color = 'var(--fg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--fg-dim)';
            }}
          >
            {isMaximized ? (
              <svg
                width="11"
                height="11"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
              >
                <path d="M3.5 3.5V1.5h7v7H8.5M1.5 3.5h7v7h-7z" />
              </svg>
            ) : (
              <svg
                width="11"
                height="11"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
              >
                <path d="M1.5 1.5h9v9h-9z" />
              </svg>
            )}
          </button>
          <button
            onClick={handleClose}
            title="Fechar"
            style={{
              width: 46,
              height: 44,
              display: 'grid',
              placeItems: 'center',
              border: 'none',
              background: 'transparent',
              color: 'var(--fg-dim)',
              cursor: 'pointer',
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#c42b1c';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--fg-dim)';
            }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
            >
              <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
