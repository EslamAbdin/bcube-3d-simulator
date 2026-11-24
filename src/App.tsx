import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { HelpModal } from './components/HelpModal';
import { LabDrawer } from './components/LabDrawer';
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
  const [sceneReady, setSceneReady] = useState(false);
  const performanceMode = useSimulatorStore((s) => s.performanceMode);
  const isHighPerf = performanceMode === 'high';

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
      <div className="h-full w-full" onContextMenu={(e) => e.preventDefault()}>
        <Canvas
          shadows={isHighPerf}
          dpr={isHighPerf ? [1, 1.5] : 1}
          camera={{ position: [0, 34, 35], fov: 38, near: 0.1, far: 300 }}
          onCreated={() => setSceneReady(true)}
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
      </div>

      {!sceneReady && (
        <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-slate-950 text-slate-200">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500/30 border-t-sky-400" />
          <p className="text-xs font-medium tracking-wide text-slate-400">
            Initializing bCube 3D Digital Logic Workbench…
          </p>
        </div>
      )}

      <TopHud />
      <LabDrawer />
      <StatusBar />
      <HelpModal />
    </div>
  );
}

export default App;
