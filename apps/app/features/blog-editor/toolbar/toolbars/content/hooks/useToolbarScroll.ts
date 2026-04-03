'use client';
import { useRef, useEffect, useCallback } from 'react';

export function useToolbarScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, didMove: false, startX: 0, scrollLeft: 0 });

  const closeAll = useCallback(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      closeAll();
      el.scrollLeft += e.deltaX ? e.deltaX : e.deltaY;
    };
    const onMouseDown = (e: MouseEvent) => {
      drag.current = { active: true, didMove: false, startX: e.clientX, scrollLeft: el.scrollLeft };
      el.style.cursor = 'grabbing';
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.startX;
      if (Math.abs(dx) > 4) {
        if (!drag.current.didMove) closeAll();
        drag.current.didMove = true;
        el.scrollLeft = drag.current.scrollLeft - dx;
      }
    };
    const onMouseUp = () => {
      if (!drag.current.active) return;
      drag.current.active = false;
      el.style.cursor = 'grab';
    };
    const onClickCapture = (e: MouseEvent) => {
      if (drag.current.didMove) {
        drag.current.didMove = false;
        e.preventDefault();
        e.stopPropagation();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('click', onClickCapture, true);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [closeAll]);

  return { ref };
}
