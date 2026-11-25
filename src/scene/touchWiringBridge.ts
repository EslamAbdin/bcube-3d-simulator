/* =========================================================================
   Mutable runtime bridge coordinating 1-finger touch wiring vs 2-finger camera
   without triggering React re-renders during continuous pointer motion.
   ========================================================================= */

import { ALL_SOCKETS, type SocketSpec } from '../schema/boardSchema';

export const TOUCH_SNAP_RADIUS = 0.55;
export const TOUCH_CLICK_GUARD_MS = 450;

export const touchWiringBridge = {
  activeTouchIds: new Set<number>(),
  activeTouchDragPointerId: null as number | null,
  touchOriginSocketId: null as string | null,
  touchDragMoved: false,
  lastTouchHandledAt: 0,
};

export function findNearestActiveSocket(
  x: number,
  z: number,
  maxRadius = TOUCH_SNAP_RADIUS,
  excludeSocketId?: string | null
): SocketSpec | null {
  let best: SocketSpec | null = null;
  let bestDistSq = maxRadius * maxRadius;

  for (const sock of ALL_SOCKETS) {
    if (excludeSocketId && sock.id === excludeSocketId) continue;
    const dx = sock.position.x - x;
    const dz = sock.position.z - z;
    const dSq = dx * dx + dz * dz;
    if (dSq <= bestDistSq) {
      bestDistSq = dSq;
      best = sock;
    }
  }

  return best;
}
