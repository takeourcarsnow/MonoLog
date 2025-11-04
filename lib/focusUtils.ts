// Utilities to temporarily remove focusability from an element subtree
export function disableFocusWithin(el: HTMLElement) {
  const nodes = el.querySelectorAll<HTMLElement>('a[href], button, input, textarea, select, [tabindex]');
  nodes.forEach((node) => {
    if (!node.hasAttribute('data-orig-tabindex')) {
      node.setAttribute('data-orig-tabindex', node.hasAttribute('tabindex') ? node.getAttribute('tabindex') || '' : '');
    }
    node.setAttribute('tabindex', '-1');
  });
}

export function restoreFocusWithin(el: HTMLElement) {
  const nodes = el.querySelectorAll<HTMLElement>('a[href], button, input, textarea, select, [tabindex]');
  nodes.forEach((node) => {
    const orig = node.getAttribute('data-orig-tabindex');
    if (orig === '') node.removeAttribute('tabindex'); else if (orig !== null) node.setAttribute('tabindex', orig);
    node.removeAttribute('data-orig-tabindex');
  });
}
