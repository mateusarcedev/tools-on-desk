import React from 'react';
import { ICONS, IconName } from './icons';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName | string;
  size?: number | string;
  strokeWidth?: number;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 18,
  strokeWidth = 1.6,
  style,
  ...props
}) => {
  const path = (ICONS as Record<string, string>)[name] || ICONS.arrow;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      style={{
        flexShrink: 0,
        strokeWidth,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        ...style,
      }}
      {...props}
    >
      <path d={path} />
    </svg>
  );
};
