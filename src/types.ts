export type ThemeMode = 'light' | 'dark';

export type CameraPreset = 'split' | 'garden' | 'pond' | 'sky';

export type AuthView = 'signin' | 'signup' | 'forgot' | 'authenticated';

export interface SceneControlState {
  theme: ThemeMode;
  themeBurstId: number;
  lastTriggeredTheme: ThemeMode | null;
  cameraPreset: CameraPreset;
  breezeIntensity: number;
  skySpeed: number;
  zenMode: boolean;
}
