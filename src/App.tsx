import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { StatusBar } from './components/StatusBar';
import { TopHud } from './components/TopHud';
import { CameraRig } from './scene/CameraRig';
import { LabEnvironment } from './scene/LabEnvironment';
import { ActiveIOModules } from './scene/parts/ActiveIOModules';
import { BoardChassis } from './scene/parts/BoardChassis';
import { JumperWires } from './scene/parts/JumperWires';
import { LogicModulesGrid } from './scene/parts/LogicModulesGrid';
import { SocketHitboxes } from './scene/parts/SocketHitboxes';
import { StandbyIOModules } from './scene/parts/StandbyIOModules';
import { ActiveSocketHeaders } from './scene/parts/WhitePinHeader';
import { useSimulatorStore } from './store/useSimulatorStore';

export function App() {
  useEffect(() => {
    const syncFromHash = () => {
      if (window.location.hash.startsWith('#circuit=')) {
        const res = useSimulatorStore.getState().loadCircuitFromHash(window.location.hash);
        if (!res.ok) {
          useSimulatorStore
            .getState()
            .showToast(res.error ?? 'Could not restore shared circuit link.', 'warning');
        }
      }
    };

    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 select-none">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 34, 35], fov: 38, near: 0.1, far: 300 }}
        onPointerMissed={() => useSimulatorStore.getState().cancelWiring()}
      >
        <LabEnvironment />
        <CameraRig />
        <BoardChassis />
        <ActiveSocketHeaders />
        <ActiveIOModules />
        <StandbyIOModules />
        <LogicModulesGrid />
        <SocketHitboxes />
        <JumperWires />
      </Canvas>
      <TopHud />
      <StatusBar />
    </div>
  );
}

export default App;
