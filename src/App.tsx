import { Canvas } from '@react-three/fiber';
import { TopHud } from './components/TopHud';
import { CameraRig } from './scene/CameraRig';
import { LabEnvironment } from './scene/LabEnvironment';
import { ActiveIOModules } from './scene/parts/ActiveIOModules';
import { BoardChassis } from './scene/parts/BoardChassis';
import { LogicModulesGrid } from './scene/parts/LogicModulesGrid';
import { StandbyIOModules } from './scene/parts/StandbyIOModules';
import { ActiveSocketHeaders } from './scene/parts/WhitePinHeader';

export function App() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 select-none">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 34, 35], fov: 38, near: 0.1, far: 300 }}
      >
        <LabEnvironment />
        <CameraRig />
        <BoardChassis />
        <ActiveSocketHeaders />
        <ActiveIOModules />
        <StandbyIOModules />
        <LogicModulesGrid />
      </Canvas>
      <TopHud />
    </div>
  );
}

export default App;
