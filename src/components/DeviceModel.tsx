'use client';

import { useEffect, useRef, useState } from 'react';
import type * as T from 'three';

type Kind = 'receiver' | 'projector';

/**
 * A device picture. If a real photo exists at /media/<kind>.png (put it in `public/media/`), that is shown.
 * Otherwise an interactive 3D illustration is drawn: slowly turning, draggable, and lit up when the device is on.
 * The 3D shapes are stylised, not exact replicas.
 */
export default function DeviceModel({ kind, on, label, sub }: { kind: Kind; on: boolean; label?: string; sub?: string }) {
  const [photo, setPhoto] = useState<'checking' | 'yes' | 'no'>('checking');
  const host = useRef<HTMLDivElement>(null);
  const onRef = useRef(on); onRef.current = on;
  const textRef = useRef({ label, sub }); textRef.current = { label, sub };

  useEffect(() => {
    const img = new Image();
    img.onload = () => setPhoto('yes');
    img.onerror = () => setPhoto('no');
    img.src = `/media/${kind}.png`;
  }, [kind]);

  useEffect(() => {
    if (photo !== 'no' || !host.current) return;
    let stop = false; let cleanup = () => {};
    (async () => {
      const THREE = await import('three');
      const { RoundedBoxGeometry } = await import('three/examples/jsm/geometries/RoundedBoxGeometry.js');
      const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
      if (stop || !host.current) return;
      const el = host.current;
      const W = () => el.clientWidth || 320; const H = () => el.clientHeight || 220;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(W(), H());
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      el.appendChild(renderer.domElement);
      renderer.domElement.style.touchAction = 'pan-y';
      renderer.domElement.style.cursor = 'grab';

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 5, 4); scene.add(key);

      const camera = new THREE.PerspectiveCamera(32, W() / H(), 0.1, 100);
      const group = new THREE.Group(); scene.add(group);
      const glows: { mat: T.MeshStandardMaterial | T.MeshBasicMaterial; color: number; on: number }[] = [];

      const std = (color: number, rough = 0.5, metal = 0.2) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
      const add = (geo: T.BufferGeometry, mat: T.Material, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); group.add(m); return m; };

      let displayTex: T.CanvasTexture | null = null; let drawDisplay: (() => void) | null = null;

      if (kind === 'receiver') {
        // Yamaha RX-V485 proportions: 435 x 171 x 327 mm (1 unit = 100 mm)
        const w = 4.35, h = 1.55, d = 3.27;
        add(new RoundedBoxGeometry(w, h, d, 4, 0.05), std(0x141416, 0.45, 0.55));
        add(new RoundedBoxGeometry(w - 0.06, h - 0.1, 0.06, 3, 0.02), std(0x1b1b1f, 0.35, 0.6), 0, 0, d / 2);
        [-1.9, 1.9].forEach((x) => [-1.3, 1.3].forEach((z) => add(new THREE.CylinderGeometry(0.16, 0.18, 0.14, 24), std(0x0a0a0a, 0.8, 0), x, -h / 2 - 0.07, z)));
        for (let i = 0; i < 14; i++) add(new THREE.BoxGeometry(2.6, 0.012, 0.05), std(0x050505, 0.9, 0), 0, h / 2 + 0.003, -1.2 + i * 0.16);
        // display
        const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
        displayTex = new THREE.CanvasTexture(cv); displayTex.colorSpace = THREE.SRGBColorSpace;
        drawDisplay = () => {
          const g = cv.getContext('2d')!; g.fillStyle = '#05070a'; g.fillRect(0, 0, 512, 128);
          if (onRef.current) {
            g.fillStyle = '#7fe9ff'; g.font = '600 52px ui-monospace, Menlo, monospace'; g.textBaseline = 'middle';
            g.fillText((textRef.current.sub || 'READY').toUpperCase().slice(0, 14), 24, 48);
            g.font = '500 28px ui-monospace, Menlo, monospace'; g.fillStyle = '#4fb8cf'; g.fillText('YAMAHA  ' + (textRef.current.label || ''), 24, 102);
          }
          displayTex!.needsUpdate = true;
        };
        drawDisplay();
        const scr = new THREE.MeshBasicMaterial({ map: displayTex });
        add(new THREE.PlaneGeometry(1.7, 0.42), scr, -0.9, 0.18, d / 2 + 0.05);
        add(new THREE.BoxGeometry(1.78, 0.5, 0.02), std(0x050505, 0.3, 0.2), -0.9, 0.18, d / 2 + 0.03);
        // knobs
        const knob = (x: number, r: number) => {
          const k = add(new THREE.CylinderGeometry(r, r * 1.04, 0.24, 48), std(0xc9ccd1, 0.28, 1), x, -0.12, d / 2 + 0.15); k.rotation.x = Math.PI / 2;
          const n = add(new THREE.BoxGeometry(0.03, 0.02, r * 0.55), std(0x222222, 0.5, 0), x, -0.12 + r * 0.55, d / 2 + 0.28); n.rotation.x = 0;
        };
        knob(1.55, 0.36); knob(0.55, 0.22);
        // buttons + power LED
        [-1.95, -1.7, -1.45, -1.2, -0.95, -0.7].forEach((x) => add(new THREE.BoxGeometry(0.17, 0.09, 0.03), std(0x303034, 0.6, 0.3), x, -0.5, d / 2 + 0.035));
        add(new THREE.BoxGeometry(0.26, 0.12, 0.04), std(0x3a3a3f, 0.5, 0.4), -1.95, 0.55, d / 2 + 0.035);
        const led = new THREE.MeshBasicMaterial({ color: 0x113311 }); add(new THREE.SphereGeometry(0.03, 12, 12), led, -1.64, 0.55, d / 2 + 0.05);
        glows.push({ mat: led, color: 0x35ff6a, on: 1 });
        camera.position.set(0, 3.1, 8.8); camera.lookAt(0, -0.1, 0);
      } else {
        // compact cube-style projector (stylised): soft white body, dark lens barrel on the front
        const w = 2.3, h = 1.8, d = 2.2;
        add(new RoundedBoxGeometry(w, h, d, 6, 0.28), std(0xe6e6e8, 0.55, 0.05));
        add(new RoundedBoxGeometry(w - 0.1, 0.05, d - 0.4, 3, 0.02), std(0xb9b9bd, 0.6, 0.1), 0, h / 2 + 0.005, 0);
        [-0.8, 0.8].forEach((x) => [-0.7, 0.7].forEach((z) => add(new THREE.CylinderGeometry(0.11, 0.13, 0.1, 20), std(0x333336, 0.8, 0), x, -h / 2 - 0.04, z)));
        const ring = add(new THREE.CylinderGeometry(0.62, 0.66, 0.2, 64), std(0x1a1a1d, 0.35, 0.8), 0.18, 0.1, d / 2 + 0.05); ring.rotation.x = Math.PI / 2;
        const lensMat = new THREE.MeshStandardMaterial({ color: 0x0a0e18, roughness: 0.06, metalness: 0.9, emissive: 0x000000 });
        const lens = add(new THREE.SphereGeometry(0.46, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2), lensMat, 0.18, 0.1, d / 2 + 0.14); lens.rotation.x = Math.PI / 2;
        glows.push({ mat: lensMat as any, color: 0x3c6dff, on: 1 });
        const led = new THREE.MeshBasicMaterial({ color: 0x113311 }); add(new THREE.SphereGeometry(0.035, 12, 12), led, -0.85, -0.55, d / 2 + 0.02);
        glows.push({ mat: led, color: 0x35ff6a, on: 1 });
        camera.position.set(0, 2.2, 6.4); camera.lookAt(0, 0, 0);
      }

      // drag to rotate; otherwise a slow sway
      let drag = false, lastX = 0, yaw = -0.55, vel = 0, idle = 0;
      const down = (e: PointerEvent) => { drag = true; lastX = e.clientX; renderer.domElement.style.cursor = 'grabbing'; renderer.domElement.setPointerCapture(e.pointerId); };
      const move = (e: PointerEvent) => { if (!drag) return; vel = (e.clientX - lastX) * 0.01; yaw += vel; lastX = e.clientX; idle = 0; };
      const up = () => { drag = false; renderer.domElement.style.cursor = 'grab'; };
      renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);

      let raf = 0; let lastText = '';
      const loop = (t: number) => {
        raf = requestAnimationFrame(loop);
        if (!drag) { idle += 1; if (idle > 90) yaw += (Math.sin(t / 2600) * 0.5 - 0.35 - yaw) * 0.02; }
        group.rotation.y = yaw;
        const isOn = onRef.current;
        glows.forEach((g) => {
          if ('emissive' in g.mat) { (g.mat as T.MeshStandardMaterial).emissive.setHex(isOn ? g.color : 0x000000); (g.mat as T.MeshStandardMaterial).emissiveIntensity = isOn ? 0.9 + Math.sin(t / 500) * 0.15 : 0; }
          else (g.mat as T.MeshBasicMaterial).color.setHex(isOn ? g.color : 0x1b221b);
        });
        const sig = `${isOn}|${textRef.current.label}|${textRef.current.sub}`;
        if (drawDisplay && sig !== lastText) { drawDisplay(); lastText = sig; }
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);

      const onResize = () => { renderer.setSize(W(), H()); camera.aspect = W() / H(); camera.updateProjectionMatrix(); };
      const ro = new ResizeObserver(onResize); ro.observe(el);

      cleanup = () => {
        cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('pointerup', up);
        renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointermove', move);
        scene.traverse((o: any) => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((x: any) => { x.map?.dispose?.(); x.dispose?.(); }); });
        pmrem.dispose(); renderer.dispose(); renderer.domElement.remove();
      };
    })();
    return () => { stop = true; cleanup(); };
  }, [photo, kind]);

  if (photo === 'yes') return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/media/${kind}.png`} alt={kind} className={`h-full w-full object-contain transition ${on ? '' : 'opacity-60 grayscale'}`} />
  );
  return <div ref={host} className={`h-full w-full transition-opacity ${on ? '' : 'opacity-70'}`} aria-label={`${kind} 3D illustration`} />;
}
