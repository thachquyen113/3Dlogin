import gsap from 'gsap';
import * as THREE from 'three';
import type { CameraVector3 } from '../types';

export interface BookInteractiveInfo {
  id?: string;
  title: string;
  cameraPos: CameraVector3;
  targetPos: CameraVector3;
  [key: string]: unknown;
}

export interface CameraControlsTarget {
  target: THREE.Vector3;
  update: () => void;
}

/**
 * GSAP-powered interactive focus on a 3D book on the bookshelves.
 *
 * 1. Animates camera.position to bookInfo.cameraPos over 1.5s (power2.inOut)
 * 2. Animates controls.target to bookInfo.targetPos with controls.update() on tick
 *    and triggers openChatUI(bookInfo.title) upon arrival.
 * 3. Pops the 3D book mesh forward by +0.15 along Z with yoyo: true (pulse pull-out).
 */
export function focusOnBook(
  bookMesh: THREE.Object3D,
  bookInfo: BookInteractiveInfo,
  camera: THREE.Camera,
  controls: CameraControlsTarget,
  openChatUI: (bookTitle: string) => void,
  callbacks?: {
    onStart?: () => void;
    onComplete?: () => void;
  },
) {
  callbacks?.onStart?.();

  // Cancel any in-flight camera or mesh tweens to avoid conflicts
  gsap.killTweensOf(camera.position);
  gsap.killTweensOf(controls.target);
  if (bookMesh) {
    gsap.killTweensOf(bookMesh.position);
  }

  // 1. Animate camera position
  gsap.to(camera.position, {
    x: bookInfo.cameraPos.x,
    y: bookInfo.cameraPos.y,
    z: bookInfo.cameraPos.z,
    duration: 1.5,
    ease: 'power2.inOut',
  });

  // 2. Animate camera lookAt / controls target & open chat UI on arrival
  gsap.to(controls.target, {
    x: bookInfo.targetPos.x,
    y: bookInfo.targetPos.y,
    z: bookInfo.targetPos.z,
    duration: 1.5,
    ease: 'power2.inOut',
    onUpdate: () => controls.update(),
    onComplete: () => {
      callbacks?.onComplete?.();
      openChatUI(bookInfo.title);
    },
  });

  // 3. Animate book mesh position (popping forward +0.15 with yoyo return)
  if (bookMesh) {
    const startZ = bookMesh.position.z;
    gsap.to(bookMesh.position, {
      z: startZ + 0.15,
      duration: 0.5,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out',
      onComplete: () => {
        bookMesh.position.z = startZ;
      },
    });
  }
}
