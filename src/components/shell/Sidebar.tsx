import React, { useState } from 'react';
import { NAV_ITEMS, ScreenId } from '../../types/navigation';
import { Icon } from '../common/Icon';

interface SidebarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  collapsed,
  onToggleCollapse,
}) => {
  const [hoveredTip, setHoveredTip] = useState<{
    label: string;
    kbd: string;
    top: number;
  } | null>(null);

  const primaryNav = NAV_ITEMS.slice(0, 8);
  const secondaryNav = NAV_ITEMS.slice(8);

  const renderNavButton = (item: (typeof NAV_ITEMS)[0]) => {
    const isSelected = currentScreen === item.id;

    return (
      <button
        key={item.id}
        onClick={() => {
          setHoveredTip(null);
          onNavigate(item.id);
        }}
        onMouseEnter={(e) => {
          if (!collapsed) return;
          const rect = e.currentTarget.getBoundingClientRect();
          setHoveredTip({
            label: item.label,
            kbd: `Ctrl ${item.key}`,
            top: rect.top + rect.height / 2,
          });
        }}
        onMouseLeave={() => setHoveredTip(null)}
        style={{
          height: 36,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 11px',
          borderRadius: 8,
          border: 'none',
          background: isSelected ? 'var(--mint-dim)' : 'transparent',
          color: isSelected ? 'var(--mint)' : 'var(--fg-dim)',
          cursor: 'pointer',
          fontFamily: 'var(--sans)',
          fontWeight: 500,
          fontSize: '13px',
          textAlign: 'left',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          transition: 'all 0.15s ease',
        }}
        onMouseOver={(e) => {
          if (!isSelected) e.currentTarget.style.color = 'var(--fg)';
        }}
        onMouseOut={(e) => {
          if (!isSelected) e.currentTarget.style.color = 'var(--fg-dim)';
        }}
      >
        <Icon name={item.icon} size={18} strokeWidth={1.6} />
        {!collapsed && (
          <>
            <span style={{ flex: 1 }}>{item.label}</span>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '10.5px',
                color: 'var(--fg-faint)',
                opacity: 0.7,
              }}
            >
              Ctrl {item.key}
            </span>
          </>
        )}
      </button>
    );
  };

  return (
    <nav
      style={{
        width: collapsed ? 56 : 212,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '10px 8px',
        background: 'var(--bg-soft)',
        borderRight: '1px solid var(--line)',
        transition: 'width 0.16s ease',
        position: 'relative',
        zIndex: 5,
      }}
    >
      {primaryNav.map(renderNavButton)}

      <div
        style={{
          height: 1,
          background: 'var(--line)',
          margin: '8px 4px',
          flexShrink: 0,
        }}
      />

      {secondaryNav.map(renderNavButton)}

      <div style={{ flex: 1 }} />

      {/* Collapse / Expand Toggle Button */}
      <button
        onClick={onToggleCollapse}
        onMouseEnter={(e) => {
          if (!collapsed) return;
          const rect = e.currentTarget.getBoundingClientRect();
          setHoveredTip({
            label: 'Expandir menu',
            kbd: 'Ctrl B',
            top: rect.top + rect.height / 2,
          });
        }}
        onMouseLeave={() => setHoveredTip(null)}
        title={collapsed ? 'Expandir menu (Ctrl+B)' : 'Recolher menu (Ctrl+B)'}
        style={{
          height: 36,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 11px',
          borderRadius: 8,
          border: 'none',
          background: 'transparent',
          color: 'var(--fg-faint)',
          cursor: 'pointer',
          fontFamily: 'var(--sans)',
          fontSize: '13px',
          textAlign: 'left',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.color = 'var(--fg)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.color = 'var(--fg-faint)';
        }}
      >
        <Icon name={collapsed ? 'right' : 'left'} size={18} strokeWidth={1.6} />
        {!collapsed && (
          <>
            <span style={{ flex: 1 }}>Recolher</span>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '10.5px',
                color: 'var(--fg-faint)',
                opacity: 0.7,
              }}
            >
              Ctrl B
            </span>
          </>
        )}
      </button>

      {/* Floating Tooltip when collapsed */}
      {collapsed && hoveredTip && (
        <div
          style={{
            position: 'fixed',
            left: 64,
            top: hoveredTip.top,
            transform: 'translateY(-50%)',
            background: 'var(--surface-2)',
            color: 'var(--fg)',
            border: '1px solid var(--line)',
            borderRadius: 6,
            padding: '5px 10px',
            fontSize: '12px',
            fontFamily: 'var(--sans)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
            zIndex: 100,
            whiteSpace: 'nowrap',
          }}
        >
          <span>{hoveredTip.label}</span>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '10px',
              color: 'var(--fg-faint)',
              background: 'var(--surface)',
              padding: '1px 5px',
              borderRadius: 3,
            }}
          >
            {hoveredTip.kbd}
          </span>
        </div>
      )}
    </nav>
  );
};
