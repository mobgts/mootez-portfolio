export function SectionMark({
  label,
  extra,
}: {
  label: string;
  extra?: string;
}) {
  return (
    <div className="mb-8 flex items-baseline justify-between gap-6 border-t border-ink/25 pt-3">
      <h2 className="text-[13px] font-medium tracking-[0.08em] text-olive-deep">
        + {label}
      </h2>
      {extra ? (
        <p className="text-[11px] tracking-[0.06em] text-muted">{extra}</p>
      ) : null}
    </div>
  );
}
