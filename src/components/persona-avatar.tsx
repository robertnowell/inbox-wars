// Persona avatar — uses Gemini-generated portrait at /personas/<id>.png with
// initials fallback if the image fails to load.

"use client";

import { useState } from "react";

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const TINTS = ["#f0ebe0", "#e8e1d0", "#ddd6c4", "#cfc7b3"];
function tintForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

export function PersonaAvatar({
  name,
  id,
  size = "md",
}: {
  name: string;
  id: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const [errored, setErrored] = useState(false);
  const dim = {
    sm: "w-8 h-8 text-[10px]",
    md: "w-11 h-11 text-xs",
    lg: "w-16 h-16 text-sm",
    xl: "w-24 h-24 text-base",
  }[size];

  const ring = "ring-1 ring-[#e8e3d8]";

  if (errored) {
    return (
      <div
        className={`${dim} ${ring} rounded-full flex items-center justify-center font-mono text-[#141413] shrink-0`}
        style={{ backgroundColor: tintForId(id) }}
      >
        {initials(name)}
      </div>
    );
  }

  return (
    <img
      src={`/personas/${id}.png`}
      alt={name}
      onError={() => setErrored(true)}
      className={`${dim} ${ring} rounded-full object-cover shrink-0`}
    />
  );
}
