/* =========================================================================
   Mutable runtime bridge coordinating 1-finger touch wiring vs 2-finger camera
   without triggering React re-renders during continuous pointer motion.
   ========================================================================= */

import { ALL_SOCKETS, type SocketSpec } from '../schema/boardSchema';

export const TOUCH_SNAP_RADIUS = 0.3;
export const TOUCH_CLICK_GUARD_MS = 450;

export const touchWiringBridge: {
  activeTouchIds: Set<number>;
  activeTouchDragPointerId: number | null;
  touchOriginSocketId: string | null;
  touchDragMoved: boolean;
  lastTouchHandledAt: number;
  pointerClientPos: { x: number; y: number } | null;
} = {
  activeTouchIds: new Set<number>(),
  activeTouchDragPointerId: null,
  touchOriginSocketId: null,
  touchDragMoved: false,
  lastTouchHandledAt: 0,
  pointerClientPos: null,
};

export function findNearestActiveSocket(
  x: number,
  z: number,
  maxRadius = TOUCH_SNAP_RADIUS,
  excludeSocketId?: string | null,
  excludeNodeId?: string | null
): SocketSpec | null {
  let best: SocketSpec | null = null;
  let bestDistSq = maxRadius * maxRadius;

  for (const sock of ALL_SOCKETS) {
    if (excludeSocketId && sock.id === excludeSocketId) continue;
    if (excludeNodeId && sock.nodeId === excludeNodeId) continue;
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
