import { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver, NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface HandData {
  handedness: 'Left' | 'Right';
  landmarks: NormalizedLandmark[];
  position: { x: number; y: number }; // Palm center usually
  velocity: { x: number; y: number };
  direction: { x: number; y: number };
  pinchStrength: number; // 0 to 1
  openness: number; // 0 to 1
  rotation: number; // in radians
}

export interface TrackingState {
  isTracking: boolean;
  leftHand: HandData | null;
  rightHand: HandData | null;
  leftHandDetected: boolean;
  rightHandDetected: boolean;
  confidence: number;
  fps: number;
  distanceBetweenHands: number | null;
}

const SMOOTHING_FACTOR = 0.3; // lightweight smoothing

function lerp(start: number, end: number, amt: number) {
  return (1 - amt) * start + amt * end;
}

function calculatePinchStrength(landmarks: NormalizedLandmark[]): number {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const dx = thumbTip.x - indexTip.x;
  const dy = thumbTip.y - indexTip.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // Max dist ~0.3, min dist ~0
  return Math.max(0, Math.min(1, 1 - (dist / 0.1)));
}

function calculateOpenness(landmarks: NormalizedLandmark[]): number {
  const wrist = landmarks[0];
  let totalDist = 0;
  const tips = [8, 12, 16, 20];
  for (const tip of tips) {
    const dx = landmarks[tip].x - wrist.x;
    const dy = landmarks[tip].y - wrist.y;
    totalDist += Math.sqrt(dx * dx + dy * dy);
  }
  // Max total dist ~2.0, min ~0.5
  return Math.max(0, Math.min(1, (totalDist - 0.5) / 1.5));
}

function calculateRotation(landmarks: NormalizedLandmark[]): number {
  const wrist = landmarks[0];
  const middleFingerMCP = landmarks[9];
  return Math.atan2(middleFingerMCP.y - wrist.y, middleFingerMCP.x - wrist.x);
}

export function useHandTracking() {
  const [state, setState] = useState<TrackingState>({
    isTracking: false,
    leftHand: null,
    rightHand: null,
    leftHandDetected: false,
    rightHandDetected: false,
    confidence: 0,
    fps: 0,
    distanceBetweenHands: null,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previousHandsRef = useRef<{ left: HandData | null, right: HandData | null }>({ left: null, right: null });
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  const requestRef = useRef<number>(0);
  const landmarkerRef = useRef<HandLandmarker | null>(null);

  useEffect(() => {
    let active = true;
    
    async function initializeTracking() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "/wasm"
        );
        
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.75,
          minHandPresenceConfidence: 0.75,
          minTrackingConfidence: 0.75
        });

        if (!active) return;
        landmarkerRef.current = landmarker;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, frameRate: 30 }
        });
        
        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        const video = document.createElement('video');
        video.srcObject = stream;
        video.playsInline = true;
        video.autoplay = true;
        // Mirror video
        video.style.transform = 'scaleX(-1)';
        videoRef.current = video;

        video.addEventListener('loadeddata', () => {
          if (!active) return;
          processVideo();
        });

      } catch (err) {
        console.error("Error initializing hand tracking:", err);
      }
    }

    let lastProcessTime = 0;

    function processVideo() {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      
      if (!video || !landmarker || video.readyState < 2) {
        if (active) requestRef.current = requestAnimationFrame(processVideo);
        return;
      }

      const nowInMs = performance.now();
      
      // Throttle tracking to ~30 FPS to reduce CPU/GPU load and heat
      if (nowInMs - lastProcessTime < 33) {
         if (active) requestRef.current = requestAnimationFrame(processVideo);
         return;
      }
      lastProcessTime = nowInMs;

      const results = landmarker.detectForVideo(video, nowInMs);
      
      // Calculate FPS
      frameCountRef.current++;
      let currentFps = state.fps;
      if (nowInMs - lastFpsTimeRef.current >= 1000) {
        currentFps = frameCountRef.current;
        frameCountRef.current = 0;
        lastFpsTimeRef.current = nowInMs;
      }

      let newLeft: HandData | null = null;
      let newRight: HandData | null = null;
      let totalConfidence = 0;

      if (results.landmarks && results.handedness) {
        for (let i = 0; i < results.landmarks.length; i++) {
          const label = results.handedness[i][0].categoryName as 'Left' | 'Right';
          const score = results.handedness[i][0].score;
          totalConfidence += score;
          
          let landmarks = results.landmarks[i];
          // Because we want to mirror the coordinates for the UI:
          landmarks = landmarks.map(lm => ({ ...lm, x: 1 - lm.x }));

          const palmCenter = landmarks[0]; // Wrist is often good enough, or average of 0, 5, 17
          const prevHand = label === 'Left' ? previousHandsRef.current.left : previousHandsRef.current.right;
          
          let smoothedLandmarks = landmarks;
          let position = { x: palmCenter.x, y: palmCenter.y };
          let velocity = { x: 0, y: 0 };
          
          if (prevHand) {
            smoothedLandmarks = landmarks.map((lm, idx) => ({
              x: lerp(prevHand.landmarks[idx].x, lm.x, SMOOTHING_FACTOR),
              y: lerp(prevHand.landmarks[idx].y, lm.y, SMOOTHING_FACTOR),
              z: lerp(prevHand.landmarks[idx].z || 0, lm.z || 0, SMOOTHING_FACTOR)
            }));
            
            const smoothedPalm = smoothedLandmarks[0];
            position = { x: smoothedPalm.x, y: smoothedPalm.y };
            velocity = {
              x: position.x - prevHand.position.x,
              y: position.y - prevHand.position.y
            };
          }

          const pinchStrength = calculatePinchStrength(smoothedLandmarks);
          const openness = calculateOpenness(smoothedLandmarks);
          const rotation = calculateRotation(smoothedLandmarks);
          const direction = {
             x: velocity.x === 0 && velocity.y === 0 ? 0 : velocity.x / Math.sqrt(velocity.x*velocity.x + velocity.y*velocity.y),
             y: velocity.x === 0 && velocity.y === 0 ? 0 : velocity.y / Math.sqrt(velocity.x*velocity.x + velocity.y*velocity.y)
          };

          const handData: HandData = {
            handedness: label as 'Left' | 'Right',
            landmarks: smoothedLandmarks,
            position,
            velocity,
            direction,
            pinchStrength,
            openness,
            rotation
          };

          if (label === 'Left') newLeft = handData;
          if (label === 'Right') newRight = handData;
        }
      }

      previousHandsRef.current = { left: newLeft, right: newRight };

      let dist = null;
      if (newLeft && newRight) {
        const dx = newLeft.position.x - newRight.position.x;
        const dy = newLeft.position.y - newRight.position.y;
        dist = Math.sqrt(dx * dx + dy * dy);
      }

      const avgConfidence = results.handedness && results.handedness.length > 0 
        ? totalConfidence / results.handedness.length 
        : 0;

      setState({
        isTracking: true,
        leftHand: newLeft,
        rightHand: newRight,
        leftHandDetected: !!newLeft,
        rightHandDetected: !!newRight,
        confidence: avgConfidence,
        fps: currentFps,
        distanceBetweenHands: dist
      });

      if (active) {
        requestRef.current = requestAnimationFrame(processVideo);
      }
    }

    initializeTracking();

    return () => {
      active = false;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
      }
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
    };
  }, []);

  return state;
}
