import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { isSoftwareGl } from '../../utils/webgl';
import { GardenTerrain } from './GardenTerrain';
import { GardenFlora } from './GardenFlora';
import { GardenFauna } from './GardenFauna';
import { CelestialSky } from './CelestialSky';
import { OfficeStudyScene } from './OfficeStudyScene';
import type {
  BookShelfSortMode,
  CameraPreset,
  CustomCameraFocus,
  FeaturedBookId,
  HoveredStudyItem,
  OfficeCameraPreset,
  SceneControlState,
} from '../../types';

// Pre-allocated colors & vectors outside render loop (zero GC)
const _dayKeyColor = new THREE.Color('#fff2cc');
const _nightKeyColor = new THREE.Color('#9cc2ff');

const _daySkyFill = new THREE.Color('#9dd6f9');
const _nightSkyFill = new THREE.Color('#233d7a');

const _dayGroundFill = new THREE.Color('#5a8751');
const _nightGroundFill = new THREE.Color('#0c192c');
const _indoorDayGroundFill = new THREE.Color('#8c6a4a');
const _indoorNightGroundFill = new THREE.Color('#1c2233');

const _dayFogColor = new THREE.Color('#dff0f6');
const _nightFogColor = new THREE.Color('#0d1a36');

const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();

const CAMERA_PRESETS: Record<
  CameraPreset,
  { pos: [number, number, number]; look: [number, number, number] }
> = {
  // Outdoor Login Botanical Sanctuary Presets
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

  // Post-Login 3D Indoor Office & Scholar Study Presets
  'office-overview': {
    pos: [0.25, 2.28, 5.35],
    look: [0.15, 1.18, -1.15],
  },
  'office-sofa': {
    pos: [-0.12, 1.62, 2.38],
    look: [-0.98, 0.95, -0.56],
  },
  'office-desk': {
    pos: [1.15, 1.72, 2.35],
    look: [2.38, 1.08, -0.62],
  },
  'office-books': {
    pos: [2.22, 1.66, -1.32],
    look: [2.3, 1.56, -3.52],
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
  customCameraFocus,
  isAuthenticated,
  isConversing,
}: {
  theme: SceneControlState['theme'];
  cameraPreset: CameraPreset;
  customCameraFocus: CustomCameraFocus | null;
  isAuthenticated: boolean;
  isConversing: boolean;
}) {
  const { camera, pointer, scene } = useThree();
  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight>(null);
  const rimLightRef = useRef<THREE.DirectionalLight>(null);

  const currentLookAt = useRef(new THREE.Vector3(-0.35, 1.35, -0.4));
  const nightMix = useRef(theme === 'dark' ? 1 : 0);
  const indoorMix = useRef(isAuthenticated ? 1 : 0);
  const converseCamMix = useRef(0);

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
    indoorMix.current = THREE.MathUtils.damp(
      indoorMix.current,
      isAuthenticated ? 1 : 0,
      3.0,
      dt,
    );

    const nm = nightMix.current;
    const im = indoorMix.current;

    // Smoothly interpolate Fog color & clear indoor density so bookshelves stay crisp
    fog.color.lerpColors(_dayFogColor, _nightFogColor, nm);
    const outdoorFog = THREE.MathUtils.lerp(0.018, 0.024, nm);
    const indoorFog = THREE.MathUtils.lerp(0.005, 0.008, nm);
    fog.density = THREE.MathUtils.lerp(outdoorFog, indoorFog, im);

    const outdoorEnv = THREE.MathUtils.lerp(0.72, 0.36, nm);
    const indoorEnv = THREE.MathUtils.lerp(0.68, 0.48, nm);
    scene.environmentIntensity = THREE.MathUtils.lerp(outdoorEnv, indoorEnv, im);

    // Smoothly transition Key Light (Sun -> Moon)
    if (keyLightRef.current) {
      keyLightRef.current.color.lerpColors(_dayKeyColor, _nightKeyColor, nm);
      const outdoorIntensity = THREE.MathUtils.lerp(2.35, 1.15, nm);
      const indoorIntensity = THREE.MathUtils.lerp(1.75, 0.85, nm);
      keyLightRef.current.intensity = THREE.MathUtils.lerp(
        outdoorIntensity,
        indoorIntensity,
        im,
      );
      keyLightRef.current.position.set(
        THREE.MathUtils.lerp(-6.8, -4.6, nm),
        THREE.MathUtils.lerp(8.5, 7.6, nm),
        THREE.MathUtils.lerp(4.2, -4.5, nm),
      );
    }

    // Smoothly transition Sky/Ground Hemisphere Fill
    if (hemiLightRef.current) {
      hemiLightRef.current.color.lerpColors(_daySkyFill, _nightSkyFill, nm);
      if (im > 0.5) {
        hemiLightRef.current.groundColor.lerpColors(
          _indoorDayGroundFill,
          _indoorNightGroundFill,
          nm,
        );
      } else {
        hemiLightRef.current.groundColor.lerpColors(_dayGroundFill, _nightGroundFill, nm);
      }
      hemiLightRef.current.intensity = THREE.MathUtils.lerp(0.95, 0.62, nm);
    }

    // Rim Light
    if (rimLightRef.current) {
      rimLightRef.current.intensity = THREE.MathUtils.lerp(0.55, 0.8, nm);
    }

    // Damped Camera Choreography + Subtle Cursor Parallax + Book / Conversation Framing
    const shouldFrameConversation =
      isAuthenticated &&
      isConversing &&
      !customCameraFocus &&
      cameraPreset === 'office-sofa';
    converseCamMix.current = THREE.MathUtils.damp(
      converseCamMix.current,
      shouldFrameConversation ? 1 : 0,
      3.5,
      dt,
    );
    const cm = converseCamMix.current;

    if (isAuthenticated && customCameraFocus) {
      const parallaxX = pointer.x * 0.06;
      const parallaxY = pointer.y * 0.04;
      _targetCamPos.set(
        customCameraFocus.cameraPos.x + parallaxX,
        customCameraFocus.cameraPos.y + parallaxY,
        customCameraFocus.cameraPos.z,
      );
      _targetLookAt.set(
        customCameraFocus.targetPos.x + parallaxX * 0.25,
        customCameraFocus.targetPos.y + parallaxY * 0.2,
        customCameraFocus.targetPos.z,
      );
    } else {
      const preset = CAMERA_PRESETS[cameraPreset];
      const parallaxScale = isAuthenticated ? 0.45 : 1.0;
      const parallaxX = pointer.x * 0.32 * parallaxScale;
      const parallaxY = pointer.y * 0.18 * parallaxScale;

      _targetCamPos.set(
        preset.pos[0] + parallaxX + cm * 0.42,
        preset.pos[1] + parallaxY,
        preset.pos[2] + cm * 0.24,
      );
      _targetLookAt.set(
        preset.look[0] + parallaxX * 0.35 + cm * 0.54,
        preset.look[1] + parallaxY * 0.25 + cm * 0.04,
        preset.look[2],
      );
    }

    const camEase = 1 - Math.exp(-3.6 * dt);
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

export function SanctuaryScene({
  state,
  shelfSortMode,
  selectedBookId,
  customCameraFocus,
  isConversing,
  isScholarSpeaking,
  scholarExternalEngaged,
  scholarLabelDomRef,
  onScholarPointerChange,
  onHoverStudyItem,
  tooltipDomRef,
  onSelectOfficeView,
  onSelectFeaturedBook,
  onOpenScholarChat,
}: {
  state: SceneControlState;
  shelfSortMode: BookShelfSortMode;
  selectedBookId: FeaturedBookId | null;
  customCameraFocus: CustomCameraFocus | null;
  isConversing: boolean;
  isScholarSpeaking: boolean;
  scholarExternalEngaged: boolean;
  scholarLabelDomRef: React.RefObject<HTMLDivElement | null>;
  onScholarPointerChange: (engaged: boolean) => void;
  onHoverStudyItem: React.Dispatch<React.SetStateAction<HoveredStudyItem | null>>;
  tooltipDomRef: React.RefObject<HTMLDivElement | null>;
  onSelectOfficeView: (preset: OfficeCameraPreset) => void;
  onSelectFeaturedBook: (bookId: FeaturedBookId, focus: CustomCameraFocus) => void;
  onOpenScholarChat: () => void;
}) {
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
            customCameraFocus={customCameraFocus}
            isAuthenticated={state.isAuthenticated}
            isConversing={isConversing}
          />
          {/* CelestialSky remains active in both outdoor garden & outside the 3D office window */}
          <CelestialSky
            theme={state.theme}
            themeBurstId={state.themeBurstId}
            lastTriggeredTheme={state.lastTriggeredTheme}
            skySpeed={state.skySpeed}
          />

          {state.isAuthenticated ? (
            <OfficeStudyScene
              theme={state.theme}
              lampsOn={state.officeLampsOn}
              shelfSortMode={shelfSortMode}
              selectedBookId={selectedBookId}
              isConversing={isConversing}
              isScholarSpeaking={isScholarSpeaking}
              scholarExternalEngaged={scholarExternalEngaged}
              scholarLabelDomRef={scholarLabelDomRef}
              onScholarPointerChange={onScholarPointerChange}
              onHoverStudyItem={onHoverStudyItem}
              tooltipDomRef={tooltipDomRef}
              onSelectOfficeView={onSelectOfficeView}
              onSelectFeaturedBook={onSelectFeaturedBook}
              onOpenScholarChat={onOpenScholarChat}
            />
          ) : (
            <>
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
            </>
          )}
        </Canvas>
      )}
    </div>
  );
}
