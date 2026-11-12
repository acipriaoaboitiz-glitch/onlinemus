import type { ReactNode } from 'react';

function Icon({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const IconMenu = () => (<Icon><path d="M4 7h16M4 12h16M4 17h16" /></Icon>);
export const IconClose = () => (<Icon><path d="M6 6l12 12M18 6L6 18" /></Icon>);
export const IconCopy = () => (<Icon><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" /></Icon>);
export const IconShare = () => (<Icon><path d="M12 15V3.5M7.5 8L12 3.5 16.5 8" /><path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" /></Icon>);
export const IconPlus = () => (<Icon><path d="M12 5v14M5 12h14" /></Icon>);
export const IconCheck = () => (<Icon><path d="M5 12.5l4.5 4.5L19 7.5" /></Icon>);
export const IconBot = () => (<Icon><rect x="4.5" y="8" width="15" height="11" rx="3" /><path d="M12 8V4.5M9 13.5h.01M15 13.5h.01M9.5 16.5h5" /></Icon>);
export const IconCrown = () => (<Icon size={16}><path d="M3.5 17.5L5 7.5l4.5 4L12 5l2.5 6.5 4.5-4 1.5 10z" /></Icon>);
export const IconBook = () => (<Icon><path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v12.5H7.5A2.5 2.5 0 0 1 5 17z" /><path d="M5 17a2.5 2.5 0 0 1 2.5-2.5H18" /></Icon>);
export const IconExit = () => (<Icon><path d="M14 4.5h4A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5h-4M10 8l-4 4 4 4M6 12h10" /></Icon>);
export const IconVolume = () => (<Icon><path d="M4.5 9.5h3L12 6v12l-4.5-3.5h-3zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></Icon>);
export const IconVibrate = () => (<Icon><rect x="8" y="4" width="8" height="16" rx="2" /><path d="M4.5 8.5v7M19.5 8.5v7" /></Icon>);

/** Cara guiñando: el botón discreto de las señas. */
export const IconWink = () => (
  <Icon size={24}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8.2 10.4h2.6" />
    <circle cx="15.2" cy="10.4" r=".6" fill="currentColor" />
    <path d="M8.5 14.6c1 1.3 2.2 1.9 3.5 1.9s2.5-.6 3.5-1.9" />
  </Icon>
);
export const IconEye = () => (
  <Icon>
    <path d="M2.8 12s3.2-6 9.2-6 9.2 6 9.2 6-3.2 6-9.2 6-9.2-6-9.2-6Z" />
    <circle cx="12" cy="12" r="2.5" />
  </Icon>
);
