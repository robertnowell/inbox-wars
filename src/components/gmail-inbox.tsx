// Compact Gmail-Promotions-tab styled inbox embedded inside a labeled card.

import type { Email } from "@/lib/types";

function brandColor(brandName: string): string {
  // Single-hue desaturated palette for sender avatar bg — no team colors,
  // each brand gets a stable but muted identifier color
  let h = 0;
  for (let i = 0; i < brandName.length; i++)
    h = (h * 31 + brandName.charCodeAt(i)) >>> 0;
  const palette = [
    "bg-stone-600",
    "bg-stone-500",
    "bg-stone-700",
    "bg-zinc-600",
    "bg-zinc-500",
    "bg-zinc-700",
    "bg-neutral-600",
    "bg-neutral-500",
    "bg-neutral-700",
    "bg-gray-600",
  ];
  return palette[h % palette.length];
}

export function GmailInbox({
  emails,
  openedIds,
  clickedIds,
  highlightId,
}: {
  emails: Email[];
  openedIds: Set<string>;
  clickedIds: Set<string>;
  highlightId?: string;
}) {
  return (
    <div className="border border-hairline rounded-md overflow-hidden bg-card">
      {/* Gmail tabs */}
      <div className="flex border-b border-hairline bg-paper">
        <div className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted">
          primary
        </div>
        <div
          className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider font-semibold text-ink border-b-2"
          style={{ borderColor: "var(--ink)" }}
        >
          promotions
        </div>
        <div className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted">
          updates
        </div>
      </div>
      {/* Email rows */}
      <ul className="divide-y divide-hairline">
        {emails.map((email) => {
          const opened = openedIds.has(email.id);
          const clicked = clickedIds.has(email.id);
          const isHighlight = highlightId === email.id;
          return (
            <li
              key={email.id}
              className={`flex items-center gap-2 px-3 py-2 ${
                isHighlight ? "bg-paper" : ""
              }`}
            >
              {/* Sender avatar */}
              <div
                className={`${brandColor(email.brandName)} w-6 h-6 rounded-full text-paper text-[10px] font-mono font-semibold flex items-center justify-center flex-shrink-0`}
              >
                {email.brandName[0]}
              </div>
              {/* Star marker */}
              <div className="w-3 text-xs">
                {opened ? (
                  <span style={{ color: "var(--verdict-deep)" }}>●</span>
                ) : (
                  <span className="text-hairline">○</span>
                )}
              </div>
              {/* Sender */}
              <div
                className={`w-28 truncate text-xs ${opened ? "font-semibold text-ink" : "text-muted"}`}
              >
                {email.brandName}
              </div>
              {/* Subject + preheader */}
              <div className="flex-1 truncate text-xs min-w-0">
                <span
                  className={
                    opened
                      ? "font-semibold text-ink"
                      : "font-normal text-muted"
                  }
                >
                  {email.subject}
                </span>
                {email.preheader && (
                  <span className="text-muted"> — {email.preheader}</span>
                )}
              </div>
              {/* Status chip */}
              <div className="flex-shrink-0 flex gap-1 font-mono">
                {clicked && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-sm border border-ink text-ink font-semibold uppercase"
                  >
                    clicked
                  </span>
                )}
                {opened && !clicked && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm border border-hairline text-muted uppercase">
                    opened
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
