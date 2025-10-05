export async function bakeRotate90(
  imgRef: React.RefObject<HTMLImageElement>,
  setImageSrc: (src: string) => void,
  setSel: (sel: null) => void,
  setOffset: (offset: { x: number; y: number }) => void
) {
  const img = imgRef.current; if (!img) return;
  const tmp = document.createElement('canvas');
  tmp.width = img.naturalHeight; tmp.height = img.naturalWidth;
  const t = tmp.getContext('2d')!;
  t.translate(tmp.width / 2, tmp.height / 2);
  t.rotate(Math.PI / 2);
  t.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  const dataUrl = tmp.toDataURL('image/png');
  setImageSrc(dataUrl);
  setSel(null);
  setOffset({ x: 0, y: 0 });
}

export async function bakeRotateMinus90(
  imgRef: React.RefObject<HTMLImageElement>,
  setImageSrc: (src: string) => void,
  setSel: (sel: null) => void,
  setOffset: (offset: { x: number; y: number }) => void
) {
  const img = imgRef.current; if (!img) return;
  const tmp = document.createElement('canvas');
  tmp.width = img.naturalHeight; tmp.height = img.naturalWidth;
  const t = tmp.getContext('2d')!;
  t.translate(tmp.width / 2, tmp.height / 2);
  t.rotate(-Math.PI / 2);
  t.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  const dataUrl = tmp.toDataURL('image/png');
  setImageSrc(dataUrl);
  setSel(null);
  setOffset({ x: 0, y: 0 });
}