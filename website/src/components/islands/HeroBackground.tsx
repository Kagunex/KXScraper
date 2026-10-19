import { useEffect, useRef, useState } from 'react';
import type * as Three from 'three';

export default function HeroBackground() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const pointerSurface = host.parentElement;
    let disposed = false;
    let disposeScene = () => {};

    void import('three').then((THREE) => {
      if (disposed) return;

      let renderer: Three.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: window.innerWidth > 700, powerPreference: 'low-power' });
      } catch {
        setFallback(true);
        return;
      }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    camera.position.set(0, 0.15, 8.6);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 600 ? 1 : 1.45));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.className = 'hero-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight(0xf4f2d9, 0x20261b, 2.1);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xc6ff4a, 3.5);
    keyLight.position.set(-3, 4, 5);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0xf4f3e8, 16, 12);
    rimLight.position.set(3, 0.2, -2);
    scene.add(rimLight);

    const rig = new THREE.Group();
    scene.add(rig);
    const assembly = new THREE.Group();
    rig.add(assembly);

    const bodyGeometry = new THREE.DodecahedronGeometry(1.22, 0);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xc6ff4a, metalness: 0.23, roughness: 0.35, flatShading: true });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    assembly.add(body);

    const edgeGeometry = new THREE.EdgesGeometry(bodyGeometry, 19);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xf4f3e8, transparent: true, opacity: 0.8 });
    assembly.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));

    const orbitMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f3e8, metalness: 0.65, roughness: 0.28 });
    const orbitA = new THREE.Mesh(new THREE.TorusGeometry(1.78, 0.025, 8, 96), orbitMaterial);
    orbitA.rotation.set(0.84, 0.18, 0.34);
    assembly.add(orbitA);
    const orbitB = new THREE.Mesh(new THREE.TorusGeometry(2.12, 0.012, 6, 96), new THREE.MeshBasicMaterial({ color: 0xc6ff4a, transparent: true, opacity: 0.62 }));
    orbitB.rotation.set(1.1, 0.58, -0.46);
    assembly.add(orbitB);

    const nodeMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f3e8, emissive: 0x252a1d, metalness: 0.2, roughness: 0.25 });
    const nodes = [
      { pos: [1.75, 0.24, 0.14], size: 0.12 },
      { pos: [-1.35, 1.4, -0.1], size: 0.09 },
      { pos: [-1.8, -0.72, 0.2], size: 0.07 },
    ];
    for (const { pos, size } of nodes) {
      const node = new THREE.Mesh(new THREE.OctahedronGeometry(size, 0), nodeMaterial);
      node.position.set(pos[0], pos[1], pos[2]);
      assembly.add(node);
    }

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(2.3, 48),
      new THREE.MeshBasicMaterial({ color: 0x7c9d38, transparent: true, opacity: 0.12, depthWrite: false }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -1.9, -0.9);
    ground.scale.set(1.1, 0.35, 1);
    scene.add(ground);

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 600 ? 1 : 1.45));
      camera.aspect = width / height;
      camera.position.z = width < 560 ? 9.8 : width < 900 ? 9.2 : 8.6;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    let inView = false;
    let frame = 0;
    let elapsed = 0;
    let previous = 0;
    let pointerX = 0;
    let pointerY = 0;
    let targetX = 0;
    let targetY = 0;
    const render = () => renderer.render(scene, camera);
    const tick = (now: number) => {
      frame = 0;
      if (!inView || document.hidden || reducedMotion.matches) return;
      const delta = Math.min((now - (previous || now)) / 1000, 0.04);
      previous = now;
      elapsed += delta;
      pointerX += (targetX - pointerX) * 0.035;
      pointerY += (targetY - pointerY) * 0.035;
      assembly.rotation.y = elapsed * 0.15 + pointerX * 0.22;
      assembly.rotation.x = Math.sin(elapsed * 0.22) * 0.11 - pointerY * 0.16;
      orbitA.rotation.z += delta * 0.075;
      orbitB.rotation.y += delta * 0.065;
      rig.position.y = Math.sin(elapsed * 0.55) * 0.055;
      render();
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (inView && !document.hidden && !reducedMotion.matches && !frame) frame = requestAnimationFrame(tick);
      else render();
    };
    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
    };
    const visibility = () => (document.hidden ? stop() : start());
    const motionChange = () => (reducedMotion.matches ? (stop(), render()) : start());
    const pointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      targetX = THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
      targetY = THREE.MathUtils.clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) start();
      else stop();
    }, { threshold: 0.02 });
    observer.observe(host);
    document.addEventListener('visibilitychange', visibility);
    reducedMotion.addEventListener('change', motionChange);
    pointerSurface?.addEventListener('pointermove', pointerMove, { passive: true });

      disposeScene = () => {
        stop();
        observer.disconnect();
        resizeObserver.disconnect();
        document.removeEventListener('visibilitychange', visibility);
        reducedMotion.removeEventListener('change', motionChange);
        pointerSurface?.removeEventListener('pointermove', pointerMove);
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
            object.geometry.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => material.dispose());
          }
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
    }).catch(() => {
      if (!disposed) setFallback(true);
    });

    return () => {
      disposed = true;
      disposeScene();
    };
  }, []);

  return (
    <div ref={hostRef} className={`hero-scene${fallback ? ' hero-scene-fallback' : ''}`} aria-hidden="true">
      {fallback && <div className="scene-fallback"><span /><i /><b /></div>}
    </div>
  );
}
