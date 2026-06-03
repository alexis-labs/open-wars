import { DoubleSize } from '@deities/athena/map/Configuration.tsx';
import { getCurrentScrollContainer } from '@deities/ui/ScrollContainer.tsx';

const isWindow = (container: Element | Window): container is Window => container === window;

export const actionWheelScrollMargin = {
  bottom: DoubleSize * 2,
  left: DoubleSize,
  right: DoubleSize,
  top: DoubleSize * 3,
} as const;

export default function ensureElementInView(
  element: HTMLElement,
  padding: Readonly<typeof actionWheelScrollMargin> = actionWheelScrollMargin,
) {
  const rect = element.getBoundingClientRect();
  const container = getCurrentScrollContainer();
  const height = isWindow(container) ? window.innerHeight : container.clientHeight;
  const width = isWindow(container) ? window.innerWidth : container.clientWidth;

  let top = 0;
  let left = 0;

  if (rect.top < padding.top) {
    top = rect.top - padding.top;
  } else if (rect.bottom > height - padding.bottom) {
    top = rect.bottom - height + padding.bottom;
  }

  if (rect.left < padding.left) {
    left = rect.left - padding.left;
  } else if (rect.right > width - padding.right) {
    left = rect.right - width + padding.right;
  }

  if (!top && !left) {
    return;
  }

  if (isWindow(container)) {
    window.scrollBy({ behavior: 'smooth', left, top });
  } else {
    container.scrollBy({ behavior: 'smooth', left, top });
  }
}
