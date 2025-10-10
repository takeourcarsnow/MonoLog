import { useRouter } from 'next/navigation';

export const useCardNavigation = (postHref: string, editing: boolean) => {
  const router = useRouter();

  const handleCardClick = (e: React.MouseEvent<HTMLElement>) => {
    try {
      // Don't navigate if editor is open or editing is active
      if (editing) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ignore clicks on interactive elements: links, buttons, inputs, labels, and images
      // Note: we intentionally do NOT exclude [role="button"] here so clicks on the
      // photo matte/canvas (which may be inside a role=button container) can still
      // navigate to the single-post view. We still block actual images and form controls.
      if (target.closest('a, button, input, textarea, select, label')) return;
      if (target.closest('img')) return;

      // If the click is inside the media area (but not on the photo), don't rely on image handlers
      // We still want clicks outside the photo on the card canvas to navigate, so only block
      // when inside elements that should be interactive (comments, actions, editor, etc.).
      if (target.closest('.post-editor-wrap')) return;
      if (target.closest('.caption') || target.closest('.actions') || target.closest('.comments')) return;

      // Use Next router to navigate to the single post URL
      router.push(postHref);
    } catch (err) {
      // Fallback: try history push
      try { window.history.pushState(null, '', postHref); } catch (_) {}
    }
  };

  return handleCardClick;
};