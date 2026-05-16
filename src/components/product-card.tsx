import type { Product } from "@/lib/types";

export function ProductCard({
  product,
  spent,
  reason,
}: {
  product: Product;
  spent?: number;
  reason?: string;
}) {
  return (
    <div className="bg-card border border-hairline rounded-md overflow-hidden">
      {product.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.thumbnailUrl}
          alt={product.name}
          className="w-full h-36 object-cover bg-paper border-b border-hairline"
        />
      ) : (
        <div className="w-full h-36 bg-paper border-b border-hairline flex items-center justify-center text-muted text-xs font-mono">
          no image
        </div>
      )}
      <div className="p-3">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
          purchased
        </div>
        <div className="font-display text-sm font-semibold text-ink leading-tight mt-1">
          {product.name}
        </div>
        <div className="font-display text-xl font-semibold text-ink mt-2 tabular-nums">
          ${(spent ?? product.price).toFixed(2)}
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
