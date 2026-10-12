import { useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';

// A finger never lands perfectly still; beyond this the gesture was a scroll.
const TAP_MOVE_TOLERANCE = 10;

// Preventing the touch's default should already stop the mouse sequence, but a
// browser that replays it anyway must not activate the element twice.
const GHOST_CLICK_WINDOW = 700;

// Only the mouse path has an event to hand over, for callers that have to keep
// the click away from the outside-press handlers.
export type TapAction = (event?:ReactMouseEvent) => void;

export interface TapActivationProps {
  onTouchStart:(event:ReactTouchEvent) => void;
  onTouchEnd:(event:ReactTouchEvent) => void;
  onClick:(event:ReactMouseEvent) => void;
}

interface TouchLike {
  target:EventTarget | null;
  currentTarget:EventTarget | null;
  changedTouches:Readonly<Record<number, { clientX:number; clientY:number } | undefined>>;
  timeStamp:number;
  preventDefault():void;
}

interface TapState {
  startedAt:{ x:number; y:number } | null;
  activatedAt:number;
}

const createTapState = ():TapState => ({ startedAt: null, activatedAt: Number.NEGATIVE_INFINITY });

/*
 * Activates an element from the touch itself instead of from the click iOS
 * Safari synthesises afterwards: it holds that click back until the second tap
 * on everything our editor UI is built from. Preventing the touch's default
 * suppresses the replayed mouse sequence, so a mouse still activates exactly
 * once, through `onClick`.
 *
 * A touch that landed in a React portal (a popover anchored to the element)
 * bubbles up the React tree to the element it was rendered from, and a nested
 * link or button answers for itself - neither is a tap on the element.
 */
function tapHandlers<ClickEvent extends { timeStamp:number }>(
  state:{ current:TapState },
  activate:(event?:ClickEvent) => void,
) {
  const isOwnTouch = (event:TouchLike) => {
    const { target, currentTarget } = event;
    if (!(target instanceof Element) || !(currentTarget instanceof Element)) return false;
    if (!currentTarget.contains(target)) return false;

    const nested = target.closest('a, button');
    return !nested || nested === currentTarget;
  };

  return {
    onTouchStart: (event:TouchLike) => {
      const touch = event.changedTouches[0];
      state.current.startedAt = touch && isOwnTouch(event) ? { x: touch.clientX, y: touch.clientY } : null;
    },
    onTouchEnd: (event:TouchLike) => {
      const start = state.current.startedAt;
      const touch = event.changedTouches[0];
      state.current.startedAt = null;
      if (!start || !touch || !isOwnTouch(event)) return;
      if (Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > TAP_MOVE_TOLERANCE) return;

      event.preventDefault();
      state.current.activatedAt = event.timeStamp;
      activate();
    },
    onClick: (event:ClickEvent) => {
      if (event.timeStamp - state.current.activatedAt < GHOST_CLICK_WINDOW) return;
      activate(event);
    },
  };
}

export function useTapActivation():(activate:TapAction) => TapActivationProps {
  const state = useRef(createTapState());
  return (activate:TapAction) => tapHandlers(state, activate);
}

// For elements ProseMirror renders outside React, such as decoration widgets.
export function bindTapActivation(element:HTMLElement, activate:() => void) {
  const handlers = tapHandlers<MouseEvent>({ current: createTapState() }, activate);
  element.addEventListener('touchstart', handlers.onTouchStart, { passive: true });
  element.addEventListener('touchend', handlers.onTouchEnd);
  element.addEventListener('click', handlers.onClick);
}
