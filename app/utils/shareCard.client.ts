import type { FoodStats } from '~/utils/foodStats';
import { listTokens, type ListMode } from '~/listTheme';

export type ShareSize = 'square' | 'story';

const DIMENSIONS: Record<ShareSize, { w: number; h: number }> = {
  square: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
};

interface ShareCardOptions {
  mode: ListMode;
  size: ShareSize;
  listName: string;
  brand: string;
  /** Localized labels so the exported card matches the UI language. */
  labels: {
    spots: string;
    cuisines: string;
    cities: string;
    visited: string;
    topCuisines: string;
    tagline: string;
  };
}

const SERIF = '"Instrument Serif", Georgia, serif';
const SANS = '"DM Sans", system-ui, sans-serif';
const MONO = '"DM Mono", ui-monospace, monospace';

/** Best-effort: make sure the brand fonts are ready before we rasterize text. */
async function ensureFonts(): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts) return;
  try {
    await Promise.all([
      fonts.load(`400 120px ${SERIF}`),
      fonts.load(`400 40px ${SANS}`),
      fonts.load(`600 40px ${SANS}`),
      fonts.load(`500 40px ${MONO}`),
    ]);
    await fonts.ready;
  } catch {
    /* fall back to system fonts if loading fails */
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Draw a branded, shareable recap card onto `canvas`. Uses the brand tokens for
 * the given mood so the card reads as the same table as the app, in square
 * (feed) or story sizes. Pure drawing — the caller handles export (toBlob).
 */
export async function renderShareCard(
  canvas: HTMLCanvasElement,
  stats: FoodStats,
  opts: ShareCardOptions
): Promise<void> {
  const { w, h } = DIMENSIONS[opts.size];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const t = listTokens[opts.mode];
  await ensureFonts();

  const margin = Math.round(w * 0.09);
  const contentW = w - margin * 2;

  // background — a soft vertical wash from page to card colour + an accent glow.
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, t.pageBg);
  bg.addColorStop(1, t.cardBg);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.15, h * 0.08, 0, w * 0.15, h * 0.08, w * 0.9);
  glow.addColorStop(0, t.glow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  let y = margin;

  // wordmark: diamond + brand
  const chip = Math.round(w * 0.03);
  ctx.save();
  ctx.translate(margin + chip / 2, y + chip / 2);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = t.accent;
  roundRect(ctx, -chip / 2, -chip / 2, chip, chip, chip * 0.28);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = t.ink;
  ctx.font = `400 ${Math.round(w * 0.045)}px ${SERIF}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(opts.brand, margin + chip * 1.6, y + chip / 2);

  // eyebrow: list name
  y += Math.round(w * 0.12);
  ctx.fillStyle = t.muted;
  ctx.font = `600 ${Math.round(w * 0.026)}px ${SANS}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(opts.listName.toUpperCase(), margin, y);

  // hero number
  y += Math.round(w * 0.155);
  ctx.fillStyle = t.ink;
  ctx.font = `400 ${Math.round(w * 0.2)}px ${SERIF}`;
  ctx.fillText(String(stats.total), margin, y);
  const totalW = ctx.measureText(String(stats.total)).width;
  ctx.fillStyle = t.accent;
  ctx.font = `400 ${Math.round(w * 0.06)}px ${SERIF}`;
  ctx.fillText(opts.labels.spots, margin + totalW + Math.round(w * 0.03), y);

  // sub-line: cuisines · cities · visited
  y += Math.round(w * 0.075);
  ctx.fillStyle = t.muted;
  ctx.font = `400 ${Math.round(w * 0.033)}px ${SANS}`;
  const sub = [
    `${stats.cuisines.length} ${opts.labels.cuisines}`,
    `${stats.cities.length} ${opts.labels.cities}`,
    `${stats.beenCount} ${opts.labels.visited}`,
  ].join('   ·   ');
  ctx.fillText(sub, margin, y);

  // divider
  y += Math.round(w * 0.06);
  ctx.strokeStyle = t.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(w - margin, y);
  ctx.stroke();

  // top cuisines bars
  y += Math.round(w * 0.075);
  ctx.fillStyle = t.faint;
  ctx.font = `600 ${Math.round(w * 0.024)}px ${SANS}`;
  ctx.fillText(opts.labels.topCuisines.toUpperCase(), margin, y);
  y += Math.round(w * 0.05);

  const top = stats.cuisines.slice(0, 5);
  const maxCount = top[0]?.count ?? 1;
  const rowH = Math.round(w * 0.052);
  const gap = Math.round(w * 0.028);
  const labelW = Math.round(contentW * 0.34);
  const barMax = contentW - labelW - Math.round(w * 0.07);
  for (const c of top) {
    ctx.fillStyle = t.ink;
    ctx.font = `400 ${Math.round(w * 0.035)}px ${SERIF}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(c.label, margin, y + rowH / 2);
    // track
    ctx.fillStyle = t.skeleton;
    roundRect(ctx, margin + labelW, y + rowH * 0.22, barMax, rowH * 0.56, rowH * 0.28);
    ctx.fill();
    // value bar
    const bw = Math.max(rowH * 0.56, (c.count / maxCount) * barMax);
    ctx.fillStyle = t.accent;
    roundRect(ctx, margin + labelW, y + rowH * 0.22, bw, rowH * 0.56, rowH * 0.28);
    ctx.fill();
    // count
    ctx.fillStyle = t.muted;
    ctx.font = `500 ${Math.round(w * 0.028)}px ${MONO}`;
    ctx.textAlign = 'right';
    ctx.fillText(String(c.count), w - margin, y + rowH / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    y += rowH + gap;
  }

  // footer tagline pinned to the bottom
  ctx.fillStyle = t.muted;
  ctx.font = `400 ${Math.round(w * 0.03)}px ${SANS}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(opts.labels.tagline, margin, h - margin);
}

/** Render the card and trigger a PNG download. */
export async function downloadShareCard(
  stats: FoodStats,
  opts: ShareCardOptions
): Promise<void> {
  const canvas = document.createElement('canvas');
  await renderShareCard(canvas, stats, opts);
  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `foodiedex-${opts.size}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
      resolve();
    }, 'image/png');
  });
}
