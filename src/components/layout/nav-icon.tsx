export function NavIcon({ icon, className }: { icon: string; className?: string }) {
  switch (icon) {
    case "dashboard":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="7" height="9" rx="1.5" strokeLinecap="round"/>
          <rect x="14" y="3" width="7" height="5" rx="1.5" strokeLinecap="round"/>
          <rect x="3" y="16" width="7" height="5" rx="1.5" strokeLinecap="round"/>
          <rect x="14" y="12" width="7" height="9" rx="1.5" strokeLinecap="round"/>
        </svg>
      );
    case "library":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 19.5V4.5C4 3.67 4.67 3 5.5 3H18.5C19.33 3 20 3.67 20 4.5V19.5C20 20.33 19.33 21 18.5 21H5.5C4.67 21 4 20.33 4 19.5Z" strokeLinecap="round"/>
          <path d="M8 7H16M8 11H16M8 15H12" strokeLinecap="round"/>
        </svg>
      );
    case "chart":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 3V21H21" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 16L11 11L15 14L21 7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "video":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="M10 9L15 12L10 15V9Z" fill="currentColor" stroke="none"/>
        </svg>
      );
    case "users":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="9" cy="7" r="3"/>
          <path d="M3 21V18C3 16.34 4.34 15 6 15H12C13.66 15 15 16.34 15 18V21"/>
          <circle cx="17" cy="8" r="2.5"/>
          <path d="M21 21V18.5C21 17.12 20.12 16 18.75 15.75"/>
        </svg>
      );
    case "feed":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9H21M9 21V9" strokeLinecap="round"/>
        </svg>
      );
    case "setlist":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
          <path strokeLinecap="round" d="M9 12h6M9 16h4"/>
        </svg>
      );
    case "trophy":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h12v2a6 6 0 01-12 0V4z"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6H4a1 1 0 00-1 1v1a3 3 0 003 3h.5"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 6h2a1 1 0 011 1v1a3 3 0 01-3 3h-.5"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 16h6v4H9z"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v4"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 20h10"/>
        </svg>
      );
    case "metronome":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v4"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 21l2-14h4l2 14H8z"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18l-4-10" strokeWidth="2"/>
          <circle cx="12" cy="7" r="1" fill="currentColor"/>
          <path strokeLinecap="round" d="M6 21h12"/>
        </svg>
      );
    case "audio":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round"/>
          <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round"/>
        </svg>
      );
    case "music_collection":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
      );
    case "training":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "social":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "album":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3"/>
          <circle cx="12" cy="12" r="6.5" strokeDasharray="2 3"/>
        </svg>
      );
    case "guitar":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M19.5 3.5L20.5 4.5M20.5 4.5L21.5 3.5M20.5 4.5V7M14.5 9.5L17 7M17 7H20.5M17 7L14.5 4.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 10C12 10 10.5 11.5 9.5 12.5C8.5 13.5 7 15 7 17C7 19.2091 8.79086 21 11 21C13 21 14.5 19.5 15.5 18.5C16.5 17.5 18 16 18 14C18 12 16.5 10.5 15 9C13.5 7.5 12 6 12 4" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="11" cy="17" r="1.5"/>
        </svg>
      );
    case "person":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1" strokeLinecap="round"/>
        </svg>
      );
    case "settings":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9v0a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "exercise":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6.5 6.5v11M17.5 6.5v11" strokeLinecap="round"/>
          <path d="M3.5 9.5v5M20.5 9.5v5" strokeLinecap="round"/>
          <path d="M6.5 12h11" strokeLinecap="round"/>
        </svg>
      );
    case "tuner":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3.5 15a9 9 0 1117 0" strokeLinecap="round"/>
          <path d="M12 15l4-4.5" strokeLinecap="round"/>
          <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none"/>
        </svg>
      );
    case "search":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="7"/>
          <path d="M16.5 16.5L21 21" strokeLinecap="round"/>
        </svg>
      );
    case "more":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/>
        </svg>
      );
    default:
      return null;
  }
}
