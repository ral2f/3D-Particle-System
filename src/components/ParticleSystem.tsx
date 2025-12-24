import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { presets, type Preset } from '../types/presets';
import { captureScreenshot, VideoRecorder } from '../utils/capture';
import { isPinchGesture, isOpenPalm, isFist, getTwoHandDistance, isPeaceSign } from '../utils/gestureRecognition';
import { savePreset, type UserPreset } from '../lib/supabase';
import CommunityGallery from './CommunityGallery';
import { Camera as CameraIcon, Video, StopCircle, Save, Share2 } from 'lucide-react';

type Template = 'hearts' | 'flowers' | 'fireworks' | 'galaxy' | 'dna' | 'butterfly' | 'wave' | 'vortex' | 'aurora';

interface ParticleSystemProps {}

function heartPoint(t: number) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
  return { x, y };
}

function flowerPoint(t: number, k = 6) {
  const r = Math.cos(k * t);
  const x = r * Math.cos(t);
  const y = r * Math.sin(t);
  return { x, y };
}

function spiralGalaxyPoint(t: number, armIndex: number) {
  const a = 0.4;
  const b = 0.25;
  const offset = (armIndex / 3) * Math.PI * 2;
  const r = a * Math.exp(b * t);
  const angle = t + offset;
  return {
    x: r * Math.cos(angle),
    y: r * Math.sin(angle),
    z: (Math.sin(t * 1.5) * 0.3)
  };
}

function dnaHelixPoint(t: number, strand: number) {
  const radius = 0.8;
  const helixHeight = 4;
  const turns = 3;
  const phase = strand * Math.PI;
  return {
    x: radius * Math.cos(t * turns * Math.PI * 2 + phase),
    y: (t - 0.5) * helixHeight,
    z: radius * Math.sin(t * turns * Math.PI * 2 + phase)
  };
}

function butterflyPoint(t: number) {
  const scale = 2;
  const x = Math.sin(t) * (Math.exp(Math.cos(t)) - 2 * Math.cos(4*t) - Math.pow(Math.sin(t/12), 5));
  const y = Math.cos(t) * (Math.exp(Math.cos(t)) - 2 * Math.cos(4*t) - Math.pow(Math.sin(t/12), 5));
  return { x: x * scale * 0.15, y: y * scale * 0.15 };
}

function buildTargets(template: Template, count: number): Float32Array {
  const targets = new Float32Array(count * 3);

  if (template === "hearts") {
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      const p = heartPoint(t);
      const sx = p.x / 10;
      const sy = p.y / 10;
      const z = (Math.random() - 0.5) * 0.8;
      targets[i*3 + 0] = sx * 2.0;
      targets[i*3 + 1] = sy * 2.0;
      targets[i*3 + 2] = z;
    }
  }

  if (template === "flowers") {
    const blooms = 5;
    const centers = Array.from({length: blooms}, (_, b) => {
      const a = (b / blooms) * Math.PI * 2;
      return {
        cx: Math.cos(a) * 2.2,
        cy: Math.sin(a) * 1.2,
        cz: (Math.random() - 0.5) * 1.2,
        k: 4 + (b % 5),
        s: 1.0 + Math.random() * 0.7
      };
    });

    for (let i = 0; i < count; i++) {
      const b = i % blooms;
      const t = (i / count) * Math.PI * 2 * (3 + b);
      const p = flowerPoint(t, centers[b].k);
      const x = centers[b].cx + p.x * centers[b].s * 2.0;
      const y = centers[b].cy + p.y * centers[b].s * 2.0;
      const z = centers[b].cz + (Math.random() - 0.5) * 0.6;
      targets[i*3 + 0] = x;
      targets[i*3 + 1] = y;
      targets[i*3 + 2] = z;
    }
  }

  if (template === "fireworks") {
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2*v - 1);
      const r = Math.cbrt(Math.random()) * 0.2;
      targets[i*3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      targets[i*3 + 1] = r * Math.cos(phi);
      targets[i*3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
  }

  if (template === "galaxy") {
    const arms = 3;
    for (let i = 0; i < count; i++) {
      const armIndex = i % arms;
      const t = (i / count) * 4 + (Math.random() - 0.5) * 0.3;
      const p = spiralGalaxyPoint(t, armIndex);
      const scatter = (Math.random() - 0.5) * 0.4;
      targets[i*3 + 0] = p.x + scatter;
      targets[i*3 + 1] = p.y + scatter;
      targets[i*3 + 2] = p.z + scatter;
    }
  }

  if (template === "dna") {
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const strand = i % 2;
      const p = dnaHelixPoint(t, strand);
      targets[i*3 + 0] = p.x;
      targets[i*3 + 1] = p.y;
      targets[i*3 + 2] = p.z;
      if (i % 40 === 0 && strand === 0) {
        const p2 = dnaHelixPoint(t, 1);
        const steps = 8;
        for (let s = 0; s < steps && i + s < count; s++) {
          const st = s / steps;
          targets[(i+s)*3 + 0] = p.x + (p2.x - p.x) * st;
          targets[(i+s)*3 + 1] = p.y + (p2.y - p.y) * st;
          targets[(i+s)*3 + 2] = p.z + (p2.z - p.z) * st;
        }
      }
    }
  }

  if (template === "butterfly") {
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 12;
      const p = butterflyPoint(t);
      const z = (Math.random() - 0.5) * 0.5;
      targets[i*3 + 0] = p.x * 3;
      targets[i*3 + 1] = p.y * 3;
      targets[i*3 + 2] = z;
    }
  }

  if (template === "wave") {
    const gridSize = Math.ceil(Math.sqrt(count));
    for (let i = 0; i < count; i++) {
      const ix = i % gridSize;
      const iy = Math.floor(i / gridSize);
      const x = (ix / gridSize - 0.5) * 6;
      const z = (iy / gridSize - 0.5) * 6;
      const y = Math.sin(x * 1.5) * Math.cos(z * 1.5) * 1.2;
      targets[i*3 + 0] = x;
      targets[i*3 + 1] = y;
      targets[i*3 + 2] = z;
    }
  }

  if (template === "vortex") {
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const height = (t - 0.5) * 6;
      const radius = (1 - t) * 2 + 0.3;
      const angle = t * Math.PI * 12;
      targets[i*3 + 0] = radius * Math.cos(angle);
      targets[i*3 + 1] = height;
      targets[i*3 + 2] = radius * Math.sin(angle);
    }
  }

  if (template === "aurora") {
    const waves = 4;
    for (let i = 0; i < count; i++) {
      const waveIndex = i % waves;
      const t = (i / count) * Math.PI * 2;
      const x = (t / (Math.PI * 2) - 0.5) * 8;
      const waveOffset = (waveIndex / waves) * 2;
      const y = Math.sin(x * 0.8 + waveOffset) * 1.5 + waveOffset;
      const z = (waveIndex - waves/2) * 0.6 + (Math.random() - 0.5) * 0.4;
      targets[i*3 + 0] = x;
      targets[i*3 + 1] = y;
      targets[i*3 + 2] = z;
    }
  }

  return targets;
}

function buildVelocities(template: Template, count: number): Float32Array {
  const vels = new Float32Array(count * 3);

  if (template === "fireworks") {
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2*v - 1);
      const speed = 1.2 + Math.random() * 2.2;
      vels[i*3 + 0] = speed * Math.sin(phi) * Math.cos(theta);
      vels[i*3 + 1] = speed * Math.cos(phi);
      vels[i*3 + 2] = speed * Math.sin(phi) * Math.sin(theta);
    }
  } else if (template === "galaxy") {
    for (let i = 0; i < count; i++) {
      vels[i*3 + 0] = (Math.random() - 0.5) * 0.08;
      vels[i*3 + 1] = (Math.random() - 0.5) * 0.08;
      vels[i*3 + 2] = (Math.random() - 0.5) * 0.08;
    }
  } else if (template === "vortex") {
    for (let i = 0; i < count; i++) {
      vels[i*3 + 0] = (Math.random() - 0.5) * 0.25;
      vels[i*3 + 1] = (Math.random() - 0.5) * 0.1;
      vels[i*3 + 2] = (Math.random() - 0.5) * 0.25;
    }
  } else {
    for (let i = 0; i < count; i++) {
      vels[i*3 + 0] = (Math.random() - 0.5) * 0.15;
      vels[i*3 + 1] = (Math.random() - 0.5) * 0.15;
      vels[i*3 + 2] = (Math.random() - 0.5) * 0.15;
    }
  }
  return vels;
}

function randomPositions(count: number, radius = 6): Float32Array {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2*v - 1);
    const r = Math.cbrt(Math.random()) * radius;
    pos[i*3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    pos[i*3 + 1] = r * Math.cos(phi);
    pos[i*3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  return pos;
}

function clamp(x: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, x));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export default function ParticleSystem({}: ParticleSystemProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [template, setTemplate] = useState<Template>('hearts');
  const [color, setColor] = useState('#ff4fd8');
  const [count, setCount] = useState(12000);
  const [size, setSize] = useState(6);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [status, setStatus] = useState('Camera: not started');
  const [rainbowMode, setRainbowMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const videoRecorderRef = useRef<VideoRecorder>(new VideoRecorder());
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; dist: number } | null>(null);
  const gestureScaleTargetRef = useRef(1.0);
  const explodeTargetRef = useRef(0);
  const rotationTargetRef = useRef(0);

  const addLog = (message: string) => {
    console.log(message);
    setDebugLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    addLog("App initialized. Ready to start camera.");
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0b0f19, 6, 24);

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 0.6, 10);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;

    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(4, 6, 4);
    scene.add(key);

    let points: THREE.Points | null = null;
    let geom: THREE.BufferGeometry | null = null;
    let mat: THREE.PointsMaterial | null = null;
    let targetPositions: Float32Array | null = null;
    let velocities: Float32Array | null = null;
    let gestureScale = 1.0;
    let fireworksT = 0;
    let rainbowT = 0;
    let explodeForce = 0;
    let rotationSpeed = 0;

    const rebuild = () => {
      if (points) {
        scene.remove(points);
        geom?.dispose();
        mat?.dispose();
        points = null;
      }

      const N = count;
      const baseSize = size;
      const particleColor = new THREE.Color(color);

      const positions = randomPositions(N, template === "fireworks" ? 0.2 : 7.0);
      targetPositions = buildTargets(template, N);
      velocities = buildVelocities(template, N);

      geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      mat = new THREE.PointsMaterial({
        color: particleColor,
        size: baseSize * 0.01,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      points = new THREE.Points(geom, mat);
      scene.add(points);

      fireworksT = 0;
    };

    const clock = new THREE.Clock();
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();

      const dt = Math.min(clock.getDelta(), 0.033);

      gestureScale = lerp(gestureScale, gestureScaleTargetRef.current, 0.12);
      explodeForce = lerp(explodeForce, explodeTargetRef.current, 0.08);
      rotationSpeed = lerp(rotationSpeed, rotationTargetRef.current, 0.05);

      if (rainbowMode) {
        rainbowT += dt * 0.5;
        const hue = (rainbowT % 1.0);
        if (mat) {
          mat.color.setHSL(hue, 0.8, 0.6);
        }
      }

      if (mat) {
        mat.size = (size * 0.01) * gestureScale;
      }

      if (points && rotationSpeed > 0.01) {
        points.rotation.y += rotationSpeed * dt;
      }

      if (geom && targetPositions && velocities) {
        const pos = geom.attributes.position.array as Float32Array;
        const N = count;

        if (template === "fireworks") {
          fireworksT += dt;
          const burstDuration = 2.2;
          const resetDuration = 0.9;
          const cycle = burstDuration + resetDuration;
          const t = fireworksT % cycle;
          const gravity = -1.25;

          for (let i = 0; i < N; i++) {
            const ix = i*3;
            if (t < burstDuration) {
              pos[ix+0] += velocities[ix+0] * dt;
              pos[ix+1] += velocities[ix+1] * dt + 0.5 * gravity * dt * dt;
              pos[ix+2] += velocities[ix+2] * dt;
              velocities[ix+1] += gravity * dt;
              velocities[ix+0] *= 0.995;
              velocities[ix+1] *= 0.995;
              velocities[ix+2] *= 0.995;
            } else {
              pos[ix+0] = lerp(pos[ix+0], 0, 0.08);
              pos[ix+1] = lerp(pos[ix+1], 0, 0.08);
              pos[ix+2] = lerp(pos[ix+2], 0, 0.08);
            }
          }

          if (t < dt) {
            velocities = buildVelocities("fireworks", N);
          }
        } else {
          const attract = 2.8;
          const swirl = 0.8;
          const noise = 0.55;

          for (let i = 0; i < N; i++) {
            const ix = i*3;
            const tx = targetPositions[ix+0];
            const ty = targetPositions[ix+1];
            const tz = targetPositions[ix+2];
            const x = pos[ix+0];
            const y = pos[ix+1];
            const z = pos[ix+2];

            const ax = (tx - x) * attract;
            const ay = (ty - y) * attract;
            const az = (tz - z) * attract;

            const sx = -z * swirl;
            const sz = x * swirl;

            const vx = velocities[ix+0] * noise;
            const vy = velocities[ix+1] * noise;
            const vz = velocities[ix+2] * noise;

            const ex = x * explodeForce * 0.5;
            const ey = y * explodeForce * 0.5;
            const ez = z * explodeForce * 0.5;

            pos[ix+0] += (ax + sx + vx + ex) * dt;
            pos[ix+1] += (ay + vy + ey) * dt;
            pos[ix+2] += (az + sz + vz + ez) * dt;
          }
        }

        geom.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          dist: 1
        };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartRef.current = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
          dist: Math.sqrt(dx * dx + dy * dy)
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const scale = dist / touchStartRef.current.dist;
        gestureScaleTargetRef.current = clamp(scale * 1.5, 0.3, 4.0);
      }
    };

    const handleTouchEnd = () => {
      touchStartRef.current = null;
      gestureScaleTargetRef.current = 1.0;
    };

    window.addEventListener('resize', handleResize);
    renderer.domElement.addEventListener('touchstart', handleTouchStart);
    renderer.domElement.addEventListener('touchmove', handleTouchMove);
    renderer.domElement.addEventListener('touchend', handleTouchEnd);

    rebuild();
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('touchstart', handleTouchStart);
      renderer.domElement.removeEventListener('touchmove', handleTouchMove);
      renderer.domElement.removeEventListener('touchend', handleTouchEnd);
      renderer.dispose();
      geom?.dispose();
      mat?.dispose();
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [template, color, count, size, cameraStarted, rainbowMode]);

  useEffect(() => {
    if (!cameraStarted || !videoRef.current) return;

    let handLandmarker: HandLandmarker | null = null;
    let animationId: number | null = null;
    let lastVideoTime = -1;
    let frameCount = 0;
    let firstResultLogged = false;

    const initMediaPipe = async () => {
      try {
        addLog("Step 1: Requesting camera access...");
        setStatus("Requesting camera access...");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false
        });

        addLog("Step 2: Camera access granted");

        if (!videoRef.current) {
          addLog("ERROR: Video element lost");
          return;
        }

        videoRef.current.srcObject = stream;

        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error("Video element lost"));
            return;
          }

          const video = videoRef.current;

          const onLoadedMetadata = () => {
            addLog("Step 3: Video metadata loaded");
            video.play().then(() => {
              addLog("Step 3b: Video playing");
              resolve();
            }).catch((err) => {
              addLog(`ERROR: Video play failed: ${err.message}`);
              reject(err);
            });
          };

          if (video.readyState >= 2) {
            onLoadedMetadata();
          } else {
            video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
            setTimeout(() => reject(new Error("Video loading timeout")), 5000);
          }
        });

        addLog("Step 4: Loading MediaPipe Vision Tasks...");
        setStatus("Loading hand tracking model...");

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        addLog("Step 5: Creating HandLandmarker...");

        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        addLog(`Device: ${isIOS ? 'iOS' : 'Other'}, trying GPU delegate...`);

        try {
          handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
          });
          addLog("Step 6: HandLandmarker created with GPU!");
        } catch (gpuError) {
          addLog("GPU failed, trying CPU fallback...");
          handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
            },
            runningMode: "VIDEO",
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
          });
          addLog("Step 6: HandLandmarker created with CPU!");
        }
        setStatus("Camera: running • Hand: not detected");

        const processFrame = () => {
          if (!handLandmarker || !videoRef.current) {
            if (handLandmarker) {
              animationId = requestAnimationFrame(processFrame);
            }
            return;
          }

          const video = videoRef.current;

          if (video.readyState === 4 && video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            frameCount++;

            if (frameCount === 1) {
              addLog("First frame processed!");
            }

            try {
              const results: HandLandmarkerResult = handLandmarker.detectForVideo(video, performance.now());

              if (!firstResultLogged) {
                addLog(`Results received! Landmarks: ${results.landmarks?.length || 0}`);
                firstResultLogged = true;
              }

              if (!results.landmarks || results.landmarks.length === 0) {
                setStatus("Camera: running • Hand: not detected");
                gestureScaleTargetRef.current = 1.0;
                explodeTargetRef.current = 0;
                rotationTargetRef.current = 0;
              } else {
                const hand1 = results.landmarks[0];
                let gesture = '';

                if (results.landmarks.length === 2) {
                  const hand2 = results.landmarks[1];
                  const distance = getTwoHandDistance(hand1, hand2);
                  gestureScaleTargetRef.current = lerp(0.5, 3.0, distance * 2);
                  rotationTargetRef.current = distance > 0.5 ? 1.5 : 0;
                  gesture = 'Two Hands - Rotate';
                  addLog("Detected: Two Hands");
                } else if (isOpenPalm(hand1)) {
                  explodeTargetRef.current = 1.5;
                  gestureScaleTargetRef.current = 1.8;
                  gesture = 'Open Palm - Explode';
                  addLog("Detected: Open Palm");
                } else if (isFist(hand1)) {
                  explodeTargetRef.current = -1.0;
                  gestureScaleTargetRef.current = 0.4;
                  gesture = 'Fist - Collapse';
                  addLog("Detected: Fist");
                } else if (isPeaceSign(hand1)) {
                  if (!rainbowMode) {
                    setRainbowMode(true);
                  }
                  gesture = 'Peace - Rainbow ON';
                  addLog("Detected: Peace Sign");
                } else {
                  const pinchData = isPinchGesture(hand1);
                  if (pinchData.isPinch) {
                    const distNorm = clamp((pinchData.distance - 0.02) / (0.20 - 0.02), 0, 1);
                    gestureScaleTargetRef.current = lerp(0.35, 3.5, distNorm);
                    explodeTargetRef.current = 0;
                    gesture = `Pinch - Scale: ${gestureScaleTargetRef.current.toFixed(2)}`;
                  } else {
                    gestureScaleTargetRef.current = 1.0;
                    explodeTargetRef.current = 0;
                  }
                }

                setStatus(`Camera: running • ${gesture}`);
              }
            } catch (err) {
              addLog(`Frame error: ${err instanceof Error ? err.message : 'Unknown'}`);
              console.error("Detection error:", err);
            }
          }

          animationId = requestAnimationFrame(processFrame);
        };

        addLog("Step 7: Starting detection loop...");
        processFrame();
        addLog("Step 8: Hand tracking active!");

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        addLog(`ERROR: ${errorMsg}`);
        setStatus(`Error: ${errorMsg}`);
        console.error("MediaPipe initialization error:", err);
      }
    };

    initMediaPipe();

    return () => {
      addLog("Cleanup: Stopping camera...");
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (handLandmarker) {
        try {
          handLandmarker.close();
        } catch (e) {
          console.error("Error closing hand landmarker:", e);
        }
      }
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [cameraStarted, rainbowMode]);

  const handleStartCamera = () => {
    if (cameraStarted || !videoRef.current) return;
    addLog("Button clicked: Starting camera...");
    setCameraStarted(true);
  };

  const handleScreenshot = () => {
    if (rendererRef.current) {
      captureScreenshot(rendererRef.current.domElement);
    }
  };

  const handleToggleRecording = () => {
    if (!rendererRef.current) return;

    if (isRecording) {
      videoRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      videoRecorderRef.current.start(rendererRef.current.domElement);
      setIsRecording(true);
    }
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) return;

    try {
      await savePreset({
        user_id: null,
        name: presetName,
        template,
        color,
        particle_count: count,
        particle_size: size,
        rainbow_mode: rainbowMode,
        is_public: true
      });
      setShowSaveDialog(false);
      setPresetName('');
      alert('Preset saved successfully!');
    } catch (error) {
      console.error('Error saving preset:', error);
      alert('Failed to save preset');
    }
  };

  const handleLoadPreset = (preset: UserPreset) => {
    setTemplate(preset.template as Template);
    setColor(preset.color);
    setCount(preset.particle_count);
    setSize(preset.particle_size);
    setRainbowMode(preset.rainbow_mode);
    setShowGallery(false);
  };

  return (
    <>
      <div ref={mountRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%' }} />

      <button
        onClick={() => setControlsVisible(!controlsVisible)}
        style={{
          position: 'fixed',
          top: '14px',
          left: '14px',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(18, 24, 38, 0.85)',
          backdropFilter: 'blur(10px)',
          color: 'white',
          fontSize: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
        }}
      >
        {controlsVisible ? '×' : '☰'}
      </button>

      <div style={{
        position: 'fixed',
        top: '14px',
        left: '14px',
        width: isMobile ? 'min(320px, calc(100vw - 28px))' : 'min(360px, calc(100vw - 28px))',
        maxHeight: isMobile ? 'calc(100vh - 28px)' : 'auto',
        overflowY: isMobile ? 'auto' : 'visible',
        background: 'rgba(18, 24, 38, 0.85)',
        border: '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(10px)',
        borderRadius: '14px',
        padding: '12px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        transform: controlsVisible ? 'translateX(0)' : 'translateX(-400px)',
        opacity: controlsVisible ? 1 : 0,
        pointerEvents: controlsVisible ? 'auto' : 'none',
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        zIndex: 1000,
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0', marginTop: '50px' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
            <strong>Gesture Particles</strong>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.68)', lineHeight: '1.35', margin: 0 }}>{status}</div>
          </div>
          <button
            onClick={handleStartCamera}
            disabled={cameraStarted}
            style={{
              width: isMobile ? '110px' : '140px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: cameraStarted ? 'rgba(100,255,100,0.15)' : 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.92)',
              padding: '10px',
              cursor: cameraStarted ? 'not-allowed' : 'pointer',
              fontSize: '11px',
              opacity: cameraStarted ? 0.6 : 1
            }}
          >
            {cameraStarted ? '✓ Camera' : 'Start Camera'}
          </button>
        </div>

        {isMobile && (
          <div style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.7)',
            background: 'rgba(100,150,255,0.15)',
            border: '1px solid rgba(100,150,255,0.3)',
            borderRadius: '8px',
            padding: '10px',
            margin: '10px 0'
          }}>
            📱 Use gestures or pinch with two fingers to scale particles
          </div>
        )}

        <div style={{ margin: '12px 0' }}>
          <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.78)', display: 'block', marginBottom: '8px' }}>Quick Presets</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            {presets.slice(0, 6).map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  setTemplate(preset.template as Template);
                  setColor(preset.color);
                  setCount(preset.count);
                  setSize(preset.size);
                }}
                style={{
                  fontSize: '11px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.92)',
                  padding: '8px 6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0' }}>
          <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.78)', width: '120px' }}>Template</label>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value as Template)}
            style={{
              width: '100%',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.92)',
              padding: '10px',
            }}
          >
            <option value="hearts">Hearts</option>
            <option value="flowers">Flowers</option>
            <option value="fireworks">Fireworks</option>
            <option value="galaxy">Spiral Galaxy</option>
            <option value="dna">DNA Helix</option>
            <option value="butterfly">Butterfly</option>
            <option value="wave">Wave</option>
            <option value="vortex">Vortex</option>
            <option value="aurora">Aurora</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0' }}>
          <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.78)', width: '120px' }}>Particle Color</label>
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={rainbowMode}
              style={{
                width: '100%',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)',
                padding: 0,
                height: '38px',
                opacity: rainbowMode ? 0.5 : 1,
                cursor: rainbowMode ? 'not-allowed' : 'pointer'
              }}
            />
            <button
              onClick={() => setRainbowMode(!rainbowMode)}
              style={{
                fontSize: '11px',
                borderRadius: '10px',
                border: `1px solid ${rainbowMode ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)'}`,
                background: rainbowMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.92)',
                padding: '8px 12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {rainbowMode ? '🌈 ON' : '🌈'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0' }}>
          <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.78)', width: '120px' }}>Particle Count</label>
          <input
            type="range"
            min="2000"
            max="30000"
            step="1000"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0' }}>
          <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.78)', width: '120px' }}>Base Size</label>
          <input
            type="range"
            min="1"
            max="14"
            step="1"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', margin: '12px 0' }}>
          <button
            onClick={handleScreenshot}
            style={{
              flex: 1,
              fontSize: '12px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.92)',
              padding: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <CameraIcon size={16} />
            Screenshot
          </button>
          <button
            onClick={handleToggleRecording}
            style={{
              flex: 1,
              fontSize: '12px',
              borderRadius: '10px',
              border: `1px solid ${isRecording ? 'rgba(255,50,50,0.4)' : 'rgba(255,255,255,0.12)'}`,
              background: isRecording ? 'rgba(255,50,50,0.15)' : 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.92)',
              padding: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {isRecording ? <StopCircle size={16} /> : <Video size={16} />}
            {isRecording ? 'Stop' : 'Record'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', margin: '12px 0' }}>
          <button
            onClick={() => setShowSaveDialog(true)}
            style={{
              flex: 1,
              fontSize: '12px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.92)',
              padding: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Save size={16} />
            Save Preset
          </button>
          <button
            onClick={() => setShowGallery(true)}
            style={{
              flex: 1,
              fontSize: '12px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.92)',
              padding: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Share2 size={16} />
            Gallery
          </button>
        </div>

        {!isMobile && (
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.68)', lineHeight: '1.35', marginTop: '8px' }}>
            <span style={{
              display: 'inline-block',
              fontSize: '10px',
              padding: '3px 6px',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              marginRight: '4px',
              marginTop: '6px'
            }}>Gesture</span>
            Pinch (thumb+index) to scale particles.
            <br />
            <span style={{
              display: 'inline-block',
              fontSize: '10px',
              padding: '3px 6px',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              marginRight: '4px',
              marginTop: '6px'
            }}>Tip</span>
            Use good light; keep hand within camera view.
          </div>
        )}
      </div>

      <div style={{
        position: 'fixed',
        right: isMobile ? '14px' : '14px',
        bottom: isMobile ? '14px' : '14px',
        width: isMobile ? '120px' : '160px',
        aspectRatio: '4 / 3',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'rgba(0,0,0,0.8)',
        overflow: 'hidden',
        opacity: cameraStarted ? 0.9 : 0,
        pointerEvents: cameraStarted ? 'auto' : 'none',
        zIndex: 500,
        transition: 'opacity 0.3s ease'
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)'
          }}
        />
      </div>

      {showGallery && (
        <CommunityGallery
          onLoadPreset={handleLoadPreset}
          onClose={() => setShowGallery(false)}
        />
      )}

      {showSaveDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(5px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            style={{
              background: 'rgba(18, 24, 38, 0.95)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: 'white', marginTop: 0 }}>Save Preset</h3>
            <input
              type="text"
              placeholder="Enter preset name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '14px',
                marginBottom: '16px'
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowSaveDialog(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: presetName.trim() ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                  color: 'white',
                  cursor: presetName.trim() ? 'pointer' : 'not-allowed',
                  opacity: presetName.trim() ? 1 : 0.5
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'fixed',
          right: isMobile ? '14px' : '14px',
          top: isMobile ? '80px' : '80px',
          width: isMobile ? '120px' : '160px',
          aspectRatio: '4 / 3',
          borderRadius: '12px',
          border: cameraStarted ? '1px solid rgba(255,255,255,0.14)' : 'none',
          background: cameraStarted ? 'rgba(255,255,255,0.05)' : 'transparent',
          overflow: 'hidden',
          opacity: cameraStarted ? 0.9 : 0,
          zIndex: cameraStarted ? 500 : -1,
          objectFit: 'cover',
          transform: 'scaleX(-1)',
          pointerEvents: cameraStarted ? 'auto' : 'none'
        }}
      />

      <div style={{
        position: 'fixed',
        left: isMobile ? '10px' : '14px',
        bottom: isMobile ? '10px' : '14px',
        maxWidth: isMobile ? 'calc(100% - 20px)' : '400px',
        minWidth: '280px',
        maxHeight: '300px',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '12px',
        padding: '12px',
        zIndex: 600,
        overflow: 'auto'
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 'bold',
          color: 'rgba(255, 255, 255, 0.9)',
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>Debug Log</span>
          <button
            onClick={() => setDebugLogs([])}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              padding: '4px 8px',
              color: 'white',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
        </div>
        {debugLogs.length === 0 ? (
          <div style={{
            fontSize: '10px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontStyle: 'italic',
            padding: '8px 0'
          }}>
            No logs yet... Waiting for camera start.
          </div>
        ) : (
          debugLogs.map((log, i) => (
            <div
              key={i}
              style={{
                fontSize: '10px',
                color: log.includes('ERROR') ? '#ff6b6b' : log.includes('Detected') ? '#51cf66' : 'rgba(255, 255, 255, 0.8)',
                padding: '4px 0',
                borderBottom: i < debugLogs.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                fontFamily: 'monospace'
              }}
            >
              {log}
            </div>
          ))
        )}
      </div>
    </>
  );
}
