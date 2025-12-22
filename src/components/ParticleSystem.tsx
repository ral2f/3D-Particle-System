import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

type Template = 'hearts' | 'flowers' | 'fireworks';

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

  useEffect(() => {
    if (!mountRef.current) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

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
    let gestureScaleTarget = 1.0;
    let fireworksT = 0;
    let mpHands: Hands | null = null;
    let mpCam: Camera | null = null;

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

      gestureScale = lerp(gestureScale, gestureScaleTarget, 0.12);

      if (mat) {
        mat.size = (size * 0.01) * gestureScale;
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

            pos[ix+0] += (ax + sx + vx) * dt;
            pos[ix+1] += (ay + vy) * dt;
            pos[ix+2] += (az + sz + vz) * dt;
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

    window.addEventListener('resize', handleResize);

    const startCamera = async () => {
      if (cameraStarted || !videoRef.current) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
        videoRef.current.srcObject = stream;

        mpHands = new Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        mpHands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7
        });

        mpHands.onResults((results) => {
          const lm = results.multiHandLandmarks?.[0];
          if (!lm) {
            setStatus("Camera: running • Hand: not detected");
            gestureScaleTarget = 1.0;
            return;
          }

          const a = lm[4], b = lm[8];
          const dx = (a.x - b.x);
          const dy = (a.y - b.y);
          const dz = (a.z - b.z);
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

          const distNorm = clamp((dist - 0.02) / (0.20 - 0.02), 0, 1);
          gestureScaleTarget = lerp(0.35, 3.5, distNorm);

          setStatus(`Camera: running • Hand: detected • Scale: ${gestureScaleTarget.toFixed(2)}`);
        });

        mpCam = new Camera(videoRef.current, {
          onFrame: async () => {
            if (mpHands && videoRef.current) {
              await mpHands.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480
        });

        mpCam.start();
        setCameraStarted(true);
        setStatus("Camera: running • Hand: not detected");
      } catch (err) {
        console.error(err);
        setStatus("Camera failed. Use HTTPS or http://localhost and allow permissions.");
      }
    };

    rebuild();
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geom?.dispose();
      mat?.dispose();
      if (mpCam) mpCam.stop();
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [template, color, count, size, cameraStarted]);

  const handleStartCamera = async () => {
    if (cameraStarted || !videoRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      videoRef.current.srcObject = stream;
      setCameraStarted(true);
    } catch (err) {
      console.error(err);
      setStatus("Camera failed. Use HTTPS or http://localhost and allow permissions.");
    }
  };

  return (
    <>
      <div ref={mountRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%' }} />

      <div style={{
        position: 'fixed',
        top: '14px',
        left: '14px',
        width: 'min(360px, calc(100vw - 28px))',
        background: 'rgba(18, 24, 38, 0.72)',
        border: '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(10px)',
        borderRadius: '14px',
        padding: '12px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
            <strong>Gesture Particles</strong>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.68)', lineHeight: '1.35', margin: 0 }}>{status}</div>
          </div>
          <button
            onClick={handleStartCamera}
            style={{
              width: '140px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.92)',
              padding: '10px',
              cursor: 'pointer'
            }}
          >
            Start Camera
          </button>
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
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0' }}>
          <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.78)', width: '120px' }}>Particle Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{
              width: '100%',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              padding: 0,
              height: '38px'
            }}
          />
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

        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.68)', lineHeight: '1.35', marginTop: '8px' }}>
          <span style={{
            display: 'inline-block',
            fontSize: '11px',
            padding: '4px 8px',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)',
            marginRight: '6px',
            marginTop: '8px'
          }}>Gesture</span>
          Pinch (thumb+index) to scale particles.
          <br />
          <span style={{
            display: 'inline-block',
            fontSize: '11px',
            padding: '4px 8px',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)',
            marginRight: '6px',
            marginTop: '8px'
          }}>Tip</span>
          Use good light; keep hand within camera view.
        </div>
      </div>

      <div style={{
        position: 'fixed',
        right: '14px',
        bottom: '14px',
        width: '160px',
        aspectRatio: '4 / 3',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
        opacity: 0.9
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
    </>
  );
}
