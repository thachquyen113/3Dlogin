export type ThemeMode = 'light' | 'dark';

export type GardenCameraPreset = 'split' | 'garden' | 'pond' | 'sky';
export type OfficeCameraPreset =
  | 'office-overview'
  | 'office-sofa'
  | 'office-desk'
  | 'office-books';

export type CameraPreset = GardenCameraPreset | OfficeCameraPreset;

export type AuthView = 'signin' | 'signup' | 'forgot';

export interface AuthenticatedUser {
  name: string;
  email: string;
}

export interface HoveredStudyItem {
  id: string;
  kind: 'book' | 'screen' | 'scholar';
  category: string;
  title: string;
  subtitle: string;
  detail: string;
  accentColor: string;
  initialX: number;
  initialY: number;
}

export interface ScholarChatMessage {
  id: string;
  role: 'user' | 'scholar';
  text: string;
  timestamp: string;
}

export interface SceneControlState {
  theme: ThemeMode;
  themeBurstId: number;
  lastTriggeredTheme: ThemeMode | null;
  cameraPreset: CameraPreset;
  breezeIntensity: number;
  skySpeed: number;
  zenMode: boolean;
  isAuthenticated: boolean;
  officeLampsOn: boolean;
}
