/* =========================================================================
   Plugin-Ready Gate Evaluator Registry (v1 Basic Gates, Extensible for v2 ICs)
   Zero React or Three.js imports.
   ========================================================================= */

import type { ActiveGateModuleType } from '../schema/boardSchema';

export type SignalLevel = 'HIGH' | 'LOW' | 'FLOATING' | 'CONFLICT';

export type LogicLevel = 'HIGH' | 'LOW';

export type GateEvaluatorFn = (
  inputs: SignalLevel[],
  ttlFloatingIsHigh: boolean
) => SignalLevel;

function resolveInput(raw: SignalLevel | undefined, ttlFloatingIsHigh: boolean): SignalLevel {
  const s = raw ?? 'FLOATING';
  if (s === 'FLOATING' && ttlFloatingIsHigh) return 'HIGH';
  return s;
}

function makeBinaryEvaluator(truthFn: (a: boolean, b: boolean) => boolean): GateEvaluatorFn {
  return (inputs, ttlFloatingIsHigh) => {
    const a = resolveInput(inputs[0], ttlFloatingIsHigh);
    const b = resolveInput(inputs[1], ttlFloatingIsHigh);
    if (a === 'CONFLICT' || b === 'CONFLICT') return 'CONFLICT';
    if (a === 'FLOATING' || b === 'FLOATING') return 'FLOATING';
    return truthFn(a === 'HIGH', b === 'HIGH') ? 'HIGH' : 'LOW';
  };
}

const evalNot: GateEvaluatorFn = (inputs, ttlFloatingIsHigh) => {
  const a = resolveInput(inputs[0], ttlFloatingIsHigh);
  if (a === 'CONFLICT') return 'CONFLICT';
  if (a === 'FLOATING') return 'FLOATING';
  return a === 'HIGH' ? 'LOW' : 'HIGH';
};

export const gateEvaluators: Record<ActiveGateModuleType, GateEvaluatorFn> = {
  IC_7404: evalNot,
  IC_7408: makeBinaryEvaluator((a, b) => a && b),
  IC_7432: makeBinaryEvaluator((a, b) => a || b),
  IC_7400: makeBinaryEvaluator((a, b) => !(a && b)),
  IC_7402: makeBinaryEvaluator((a, b) => !(a || b)),
  IC_7486: makeBinaryEvaluator((a, b) => a !== b),
};
