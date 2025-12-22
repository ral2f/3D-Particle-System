import { NormalizedLandmark } from '@mediapipe/hands';

export function isPinchGesture(landmarks: NormalizedLandmark[]): { isPinch: boolean; distance: number } {
  const thumb = landmarks[4];
  const index = landmarks[8];

  const dx = thumb.x - index.x;
  const dy = thumb.y - index.y;
  const dz = thumb.z - index.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  return {
    isPinch: distance < 0.08,
    distance
  };
}

export function isOpenPalm(landmarks: NormalizedLandmark[]): boolean {
  const fingerTips = [8, 12, 16, 20];
  const fingerBases = [5, 9, 13, 17];

  let extendedFingers = 0;

  for (let i = 0; i < fingerTips.length; i++) {
    const tip = landmarks[fingerTips[i]];
    const base = landmarks[fingerBases[i]];

    if (tip.y < base.y - 0.05) {
      extendedFingers++;
    }
  }

  const thumbTip = landmarks[4];
  const thumbBase = landmarks[2];
  if (Math.abs(thumbTip.x - thumbBase.x) > 0.05) {
    extendedFingers++;
  }

  return extendedFingers >= 4;
}

export function isFist(landmarks: NormalizedLandmark[]): boolean {
  const fingerTips = [8, 12, 16, 20];
  const palm = landmarks[0];

  let closedFingers = 0;

  for (const tipIndex of fingerTips) {
    const tip = landmarks[tipIndex];
    const dx = tip.x - palm.x;
    const dy = tip.y - palm.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 0.15) {
      closedFingers++;
    }
  }

  return closedFingers >= 3;
}

export function getTwoHandDistance(hand1: NormalizedLandmark[], hand2: NormalizedLandmark[]): number {
  const palm1 = hand1[0];
  const palm2 = hand2[0];

  const dx = palm1.x - palm2.x;
  const dy = palm1.y - palm2.y;
  const dz = palm1.z - palm2.z;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function isPeaceSign(landmarks: NormalizedLandmark[]): boolean {
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];

  const indexBase = landmarks[5];
  const middleBase = landmarks[9];
  const ringBase = landmarks[13];
  const pinkyBase = landmarks[17];

  const indexExtended = indexTip.y < indexBase.y - 0.05;
  const middleExtended = middleTip.y < middleBase.y - 0.05;
  const ringClosed = ringTip.y >= ringBase.y;
  const pinkyClosed = pinkyTip.y >= pinkyBase.y;

  return indexExtended && middleExtended && ringClosed && pinkyClosed;
}
