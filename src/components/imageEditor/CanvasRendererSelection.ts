export function drawSelection(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  sel: { x: number; y: number; w: number; h: number },
  dashOffset: number,
  dpr: number
) {
  ctx.save();
  ctx.strokeStyle = "#00aaff";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  // animate marching-dashed selection using an offset
  ctx.lineDashOffset = dashOffset;
  ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);
  ctx.restore();

  // rule-of-thirds overlay inside the selection (double-stroke for contrast)
  try {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    // compute thirds
    const tx1 = sel.x + sel.w / 3;
    const tx2 = sel.x + (sel.w * 2) / 3;
    const ty1 = sel.y + sel.h / 3;
    const ty2 = sel.y + (sel.h * 2) / 3;

    // draw darker base lines for contrast on light backgrounds
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0,0,0,0.32)';
    ctx.moveTo(tx1, sel.y); ctx.lineTo(tx1, sel.y + sel.h);
    ctx.moveTo(tx2, sel.y); ctx.lineTo(tx2, sel.y + sel.h);
    ctx.moveTo(sel.x, ty1); ctx.lineTo(sel.x + sel.w, ty1);
    ctx.moveTo(sel.x, ty2); ctx.lineTo(sel.x + sel.w, ty2);
    ctx.stroke();

    // subtle light lines on top for visibility on dark backgrounds
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.moveTo(tx1, sel.y); ctx.lineTo(tx1, sel.y + sel.h);
    ctx.moveTo(tx2, sel.y); ctx.lineTo(tx2, sel.y + sel.h);
    ctx.moveTo(sel.x, ty1); ctx.lineTo(sel.x + sel.w, ty1);
    ctx.moveTo(sel.x, ty2); ctx.lineTo(sel.x + sel.w, ty2);
    ctx.stroke();
    ctx.restore();
  } catch (e) {
    // drawing extras should never crash; if it does, silently continue
  }

  // dim outside selection
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width / dpr, canvas.height / dpr);
  ctx.rect(sel.x, sel.y, sel.w, sel.h);
  // @ts-ignore
  ctx.fill("evenodd");
  ctx.restore();

  // Draw resize handles
  const handleSize = 8;
  ctx.fillStyle = "#00aaff";
  const handles = [
    { x: sel.x - handleSize/2, y: sel.y - handleSize/2 }, // top-left
    { x: sel.x + sel.w - handleSize/2, y: sel.y - handleSize/2 }, // top-right
    { x: sel.x - handleSize/2, y: sel.y + sel.h - handleSize/2 }, // bottom-left
    { x: sel.x + sel.w - handleSize/2, y: sel.y + sel.h - handleSize/2 }, // bottom-right
    { x: sel.x + sel.w/2 - handleSize/2, y: sel.y - handleSize/2 }, // top
    { x: sel.x + sel.w/2 - handleSize/2, y: sel.y + sel.h - handleSize/2 }, // bottom
    { x: sel.x - handleSize/2, y: sel.y + sel.h/2 - handleSize/2 }, // left
    { x: sel.x + sel.w - handleSize/2, y: sel.y + sel.h/2 - handleSize/2 }, // right
  ];
  handles.forEach(h => {
    ctx.fillRect(h.x, h.y, handleSize, handleSize);
  });
}