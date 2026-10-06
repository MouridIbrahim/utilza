export function ToolLimitations({ warnings }) {
  const items = warnings || [];
  if (items.length === 0) return null;
  return (
    <section aria-label="Limitations" className="rounded-2xl border border-[#f3d38b] bg-[#fff8e8] p-4">
      <h2 className="font-semibold">Limitations</h2>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
        {items.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </section>
  );
}

export function ToolPrivacyNotice() {
  return (
    <p className="text-[13px] text-[var(--color-text-muted)]">
      Files are processed on the server and results are short-lived downloads (about 1 hour).
      Nothing is kept as a file library.
    </p>
  );
}
