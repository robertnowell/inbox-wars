import type { Email } from "@/lib/types";

export function EmailCard({
  email,
  reason,
  isCandidate = false,
}: {
  email: Email;
  reason?: string;
  isCandidate?: boolean;
}) {
  return (
    <div
      className={`bg-card border border-hairline rounded-md overflow-hidden ${
        isCandidate ? "ring-1 ring-ink/30" : ""
      }`}
    >
      {email.previewScreenshotUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={email.previewScreenshotUrl}
          alt={email.subject}
          className="w-full bg-paper max-h-96 object-cover object-top border-b border-hairline"
        />
      ) : (
        <div className="bg-paper border-b border-hairline p-6 h-32 flex flex-col items-center justify-center text-center">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
            {email.brandName}
          </div>
          <div className="text-sm text-ink mt-2 line-clamp-2 px-2">
            {email.subject}
          </div>
        </div>
      )}
      <div className="p-3">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
          {email.brandName}
        </div>
        <div className="font-display text-sm font-semibold text-ink leading-tight mt-1">
          {email.subject}
        </div>
        {reason && (
          <div
            className="mt-3 pt-3 border-t border-hairline text-xs text-ink italic leading-relaxed"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            &ldquo;{reason}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}
