export function getPointerPos(e: PointerEvent | React.PointerEvent, canvas: HTMLCanvasElement | null) {
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  return { x: (e as any).clientX - rect.left, y: (e as any).clientY - rect.top };
}
