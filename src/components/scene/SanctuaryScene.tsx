import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { isSoftwareGl } from '../../utils/webgl';
import { GardenTerrain } from './GardenTerrain';
import { GardenFlora } from './GardenFlora';
import { GardenFauna } from './GardenFauna';
import { CelestialSky } from './CelestialSky';
import type { CameraPreset, SceneControlState } from '../../types';

// Pre-allocated colors & vectors outside render loop (zero GC)
const _dayKeyColor = new THREE.Color('#fff2cc');
const _nightKeyColor = new THREE.Color('#9cc2ff');

const _daySkyFill = new THREE.Color('#9dd6f9');
const _nightSkyFill = new THREE.Color('#233d7a');

const _dayGroundFill = new THREE.Color('#5a8751');
const _nightGroundFill = new THREE.Color('#0c192c');

const _dayFogColor = new THREE.Color('#dff0f6');
const _nightFogColor = new THREE.Color('#0d1a36');

const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();

const CAMERA_PRESETS: Record<
  CameraPreset,
  { pos: [number, number, number]; look: [number, number, number] }
> = {
  // Default split composition: lush 3D garden clearly framed on left, rotating particle vortex framed behind right login card
  split: {
    pos: [0.15, 2.25, 8.65],
    look: [-0.35, 1.35, -0.4],
  },
  garden: {
    pos: [-3.45, 1.85, 4.55],
    look: [-4.35, 1.25, -0.65],
  },
  pond: {
    pos: [-1.55, 1.45, 4.15],
    look: [-3.45, 0.05, 1.35],
  },
  sky: {
    pos: [0.35, 1.55, 7.8],
    look: [-2.8, 3.85, -6.5],
  },
};

function StudioEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.65;
    roomEnv.dispose();
    pmremGenerator.dispose();

    if (!isSoftwareGl) {
      // Pre-warm shaders once environment is ready
      requestAnimationFrame(() => {
        try {
          gl.compile(scene, new THREE.PerspectiveCamera());
        } catch {
          // Ignore optional pre-warm errors
        }
      });
    }

    return () => {
      envRT.dispose();
    };
  }, [gl, scene]);

  return null;
}

/**
 * Software WebGL Pacer: uses WebGL2 fenceSync + 80ms pause between CPU frames
 * so software-WebGL environments never starve UI responsiveness or screenshots.
 */
function SoftwareGlPacer() {
  const { gl, invalidate } = useThree();

  useEffect(() => {
    if (!isSoftwareGl) return;
    let cancelled = false;
    let timerId = 0;

    const scheduleNext = () => {
      if (cancelled) return;
      invalidate();
      const rawGl = gl.getContext() as WebGL2RenderingContext | WebGLRenderingContext;
      if ('fenceSync' in rawGl && typeof rawGl.fenceSync === 'function') {
        const sync = rawGl.fenceSync(rawGl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        rawGl.flush();
        const poll = () => {
          if (cancelled) {
            if (sync) rawGl.deleteSync(sync);
            return;
          }
          const state = sync && rawGl.getSyncParameter(sync, rawGl.SYNC_STATUS);
          if (state === rawGl.UNSIGNALED) {
            timerId = window.setTimeout(poll, 6);
          } else {
            if (sync) rawGl.deleteSync(sync);
            timerId = window.setTimeout(scheduleNext, 80);
          }
        };
        timerId = window.setTimeout(poll, 6);
      } else {
        timerId = window.setTimeout(scheduleNext, 90);
      }
    };

    scheduleNext();
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [gl, invalidate]);

  return null;
}

function LightingAndCameraRig({
  theme,
  cameraPreset,
}: {
  theme: SceneControlState['theme'];
  cameraPreset: CameraPreset;
}) {
  const { camera, pointer, scene } = useThree();
  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight>(null);
  const rimLightRef = useRef<THREE.DirectionalLight>(null);

  const currentLookAt = useRef(new THREE.Vector3(-0.35, 1.35, -0.4));
  const nightMix = useRef(theme === 'dark' ? 1 : 0);

  const fog = useMemo(
    () => new THREE.FogExp2(theme === 'dark' ? '#0d1a36' : '#dff0f6', 0.022),
    [],
  );

  useEffect(() => {
    scene.fog = fog;
    return () => {
      scene.fog = null;
    };
  }, [scene, fog]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const targetNight = theme === 'dark' ? 1 : 0;
    nightMix.current = THREE.MathUtils.damp(nightMix.current, targetNight, 2.5, dt);
    const nm = nightMix.current;

    // Smoothly interpolate Fog color & density
    fog.color.lerpColors(_dayFogColor, _nightFogColor, nm);
    fog.density = THREE.MathUtils.lerp(0.018, 0.024, nm);
    scene.environmentIntensity = THREE.MathUtils.lerp(0.72, 0.36, nm);

    // Smoothly transition Key Light (Sun -> Moon)
    if (keyLightRef.current) {
      keyLightRef.current.color.lerpColors(_dayKeyColor, _nightKeyColor, nm);
      keyLightRef.current.intensity = THREE.MathUtils.lerp(2.35, 1.15, nm);
      keyLightRef.current.position.set(
        THREE.MathUtils.lerp(-6.8, -4.6, nm),
        THREE.MathUtils.lerp(8.5, 7.6, nm),
        THREE.MathUtils.lerp(4.2, -4.5, nm),
      );
    }

    // Smoothly transition Sky/Ground Hemisphere Fill
    if (hemiLightRef.current) {
      hemiLightRef.current.color.lerpColors(_daySkyFill, _nightSkyFill, nm);
      hemiLightRef.current.groundColor.lerpColors(_dayGroundFill, _nightGroundFill, nm);
      hemiLightRef.current.intensity = THREE.MathUtils.lerp(0.95, 0.58, nm);
    }

    // Rim Light
    if (rimLightRef.current) {
      rimLightRef.current.intensity = THREE.MathUtils.lerp(0.55, 0.85, nm);
    }

    // Damped Camera Choreography + Subtle Cursor Parallax
    const preset = CAMERA_PRESETS[cameraPreset];
    const parallaxX = pointer.x * 0.32;
    const parallaxY = pointer.y * 0.18;

    _targetCamPos.set(
      preset.pos[0] + parallaxX,
      preset.pos[1] + parallaxY,
      preset.pos[2],
    );
    _targetLookAt.set(
      preset.look[0] + parallaxX * 0.35,
      preset.look[1] + parallaxY * 0.25,
      preset.look[2],
    );

    const camEase = 1 - Math.exp(-3.4 * dt);
    camera.position.lerp(_targetCamPos, camEase);
    currentLookAt.current.lerp(_targetLookAt, camEase);
    camera.lookAt(currentLookAt.current);
  });

  return (
    <>
      <directionalLight
        ref={keyLightRef}
        position={[-6.8, 8.5, 4.2]}
        intensity={2.35}
        color="#fff2cc"
        castShadow={!isSoftwareGl}
        shadow-mapSize-width={1536}
        shadow-mapSize-height={1536}
        shadow-camera-near={0.5}
        shadow-camera-far={28}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <hemisphereLight
        ref={hemiLightRef}
        args={['#9dd6f9', '#5a8751', 0.95]}
        position={[0, 18, 0]}
      />
      <directionalLight
        ref={rimLightRef}
        position={[6.5, 5.2, -6.5]}
        intensity={0.55}
        color="#bae6fd"
      />
    </>
  );
}

export function SanctuaryScene({ state }: { state: SceneControlState }) {
  const [contextLost, setContextLost] = useState(false);

  return (
    <div className="fixed inset-0 w-full h-full select-none z-0">
      {contextLost ? (
        <div
          className="w-full h-full flex items-center justify-center transition-colors duration-700"
          style={{ backgroundColor: 'var(--bg-canvas)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Restoring 3D Botanical Sanctuary...
          </p>
        </div>
      ) : (
        <Canvas
          frameloop={isSoftwareGl ? 'demand' : 'always'}
          dpr={isSoftwareGl ? 1 : [1, 2]}
          shadows={!isSoftwareGl}
          camera={{ position: [0.15, 2.25, 8.65], fov: 44, near: 0.1, far: 100 }}
          gl={{
            antialias: !isSoftwareGl,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.06,
          }}
          onCreated={({ gl }) => {
            gl.outputColorSpace = THREE.SRGBColorSpace;
            if (!isSoftwareGl) {
              gl.shadowMap.enabled = true;
              gl.shadowMap.type = THREE.PCFSoftShadowMap;
            }
            const dom = gl.domElement;
            dom.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              setContextLost(true);
            });
            dom.addEventListener('webglcontextrestored', () => {
              setContextLost(false);
            });
          }}
        >
          <StudioEnvironment />
          <SoftwareGlPacer />
          <LightingAndCameraRig
            theme={state.theme}
            cameraPreset={state.cameraPreset}
          />
          <CelestialSky
            theme={state.theme}
            themeBurstId={state.themeBurstId}
            lastTriggeredTheme={state.lastTriggeredTheme}
            skySpeed={state.skySpeed}
          />
          <GardenTerrain
            theme={state.theme}
            breezeIntensity={state.breezeIntensity}
          />
          <GardenFlora
            theme={state.theme}
            breezeIntensity={state.breezeIntensity}
          />
          <GardenFauna
            theme={state.theme}
            breezeIntensity={state.breezeIntensity}
          />
        </Canvas>
      )}
    </div>
  );
}
