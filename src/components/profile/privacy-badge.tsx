export function PrivacyBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em]">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <span>Compte privé</span>
    </div>
  );
}
