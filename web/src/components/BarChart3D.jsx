import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function BarChart3D({ data }) {
    const mountRef = useRef(null);
    const rendererRef = useRef(null);

    useEffect(() => {
        if (!mountRef.current) return;
        if (rendererRef.current) return;

        const container = mountRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene
        const scene = new THREE.Scene();

        // Camera — fixed isometric angle, NO rotation
        const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 1000);
        camera.position.set(28, 16, 28);
        camera.lookAt(0, 1, 0);

        // Renderer — transparent background
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Lighting — warm glow
        const ambientLight = new THREE.AmbientLight(0x332244, 0.5);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffeedd, 1.0);
        dirLight.position.set(5, 20, 10);
        scene.add(dirLight);

        const warmLight = new THREE.PointLight(0xffaa44, 1.5, 40);
        warmLight.position.set(0, 12, 0);
        scene.add(warmLight);

        const purpleLight = new THREE.PointLight(0x8844cc, 0.8, 35);
        purpleLight.position.set(-10, 3, -10);
        scene.add(purpleLight);

        // Reference color gradient: purple → orange → yellow → white
        function getBarColor(h) {
            h = Math.max(0, Math.min(1, h));
            const r = h < 0.3
                ? 0.35 + h * 1.5    // purple-ish red
                : h < 0.6
                    ? 0.8 + (h - 0.3) * 0.6  // orange red
                    : Math.min(1, 0.95 + (h - 0.6) * 0.12);  // near white

            const g = h < 0.3
                ? 0.1 + h * 0.5     // low green
                : h < 0.6
                    ? 0.25 + (h - 0.3) * 2.0  // rising to yellow
                    : Math.min(1, 0.85 + (h - 0.6) * 0.38);  // near white

            const b = h < 0.3
                ? 0.6 - h * 0.8     // purple blue fading
                : h < 0.6
                    ? 0.36 - (h - 0.3) * 0.8  // orange losing blue
                    : Math.min(1, 0.12 + (h - 0.6) * 2.2);  // rising to white

            return new THREE.Color(r, g, b);
        }

        // Grid configuration — dense like reference
        const gridSize = 40;
        const spacing = 0.32;
        const barWidth = spacing * 0.75;
        const maxHeight = 12;

        // Build heightmap grid
        const grid = Array.from({ length: gridSize }, () =>
            Array.from({ length: gridSize }, () => 0)
        );

        if (data && data.length > 0) {
            // Map earthquake data to grid
            const lats = data.map(e => e.latitude);
            const lons = data.map(e => e.longitude);
            const minLat = Math.min(...lats), maxLat = Math.max(...lats);
            const minLon = Math.min(...lons), maxLon = Math.max(...lons);
            const latRange = maxLat - minLat || 1;
            const lonRange = maxLon - minLon || 1;

            data.forEach(quake => {
                const gx = Math.floor(((quake.longitude - minLon) / lonRange) * (gridSize - 1));
                const gz = Math.floor(((quake.latitude - minLat) / latRange) * (gridSize - 1));
                const cx = Math.max(0, Math.min(gridSize - 1, gx));
                const cz = Math.max(0, Math.min(gridSize - 1, gz));
                grid[cz][cx] += quake.magnitude || 1;
            });

            // Apply Gaussian smoothing for natural mountain look
            const smoothed = Array.from({ length: gridSize }, () =>
                Array.from({ length: gridSize }, () => 0)
            );
            const kernel = 2;
            for (let z = 0; z < gridSize; z++) {
                for (let x = 0; x < gridSize; x++) {
                    let sum = 0, count = 0;
                    for (let dz = -kernel; dz <= kernel; dz++) {
                        for (let dx = -kernel; dx <= kernel; dx++) {
                            const nz = z + dz, nx = x + dx;
                            if (nz >= 0 && nz < gridSize && nx >= 0 && nx < gridSize) {
                                const weight = Math.exp(-(dx * dx + dz * dz) / (kernel * 1.2));
                                sum += grid[nz][nx] * weight;
                                count += weight;
                            }
                        }
                    }
                    smoothed[z][x] = sum / count;
                }
            }
            for (let z = 0; z < gridSize; z++)
                for (let x = 0; x < gridSize; x++)
                    grid[z][x] = smoothed[z][x];
        } else {
            // Fallback: procedural mountain distribution matching reference
            const cx = gridSize * 0.45, cz = gridSize * 0.5;
            for (let z = 0; z < gridSize; z++) {
                for (let x = 0; x < gridSize; x++) {
                    const dx = (x - cx) / (gridSize * 0.35);
                    const dz = (z - cz) / (gridSize * 0.4);
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    const peak = Math.exp(-dist * dist * 2.5) * 3500;
                    const noise = Math.random() * 120 * Math.max(0, 1 - dist * 0.7);
                    const scatter = Math.random() < 0.03 ? Math.random() * 400 : 0;
                    grid[z][x] = Math.max(0, peak + noise + scatter);
                }
            }
        }

        // Find max value
        let maxVal = 0;
        for (let z = 0; z < gridSize; z++)
            for (let x = 0; x < gridSize; x++)
                if (grid[z][x] > maxVal) maxVal = grid[z][x];
        if (maxVal === 0) maxVal = 1;

        // Create bars
        const offsetX = (gridSize * spacing) / 2;
        const offsetZ = (gridSize * spacing) / 2;

        for (let z = 0; z < gridSize; z++) {
            for (let x = 0; x < gridSize; x++) {
                const normalized = grid[z][x] / maxVal;
                if (normalized < 0.008) continue;  // Skip nearly-zero bars

                const barHeight = Math.max(0.03, normalized * maxHeight);
                const color = getBarColor(normalized);

                const geometry = new THREE.BoxGeometry(barWidth, barHeight, barWidth);
                const material = new THREE.MeshStandardMaterial({
                    color: color,
                    emissive: color.clone().multiplyScalar(normalized * 0.35),
                    roughness: 0.4,
                    metalness: 0.1,
                    transparent: normalized < 0.15,
                    opacity: normalized < 0.15 ? 0.5 + normalized * 3.3 : 1.0,
                });

                const bar = new THREE.Mesh(geometry, material);
                bar.position.set(
                    x * spacing - offsetX,
                    barHeight / 2,
                    z * spacing - offsetZ
                );
                scene.add(bar);
            }
        }

        // Subtle base plane
        const planeSize = gridSize * spacing + 0.5;
        const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
        const planeMat = new THREE.MeshBasicMaterial({
            color: 0x0a0a12,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide,
        });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = 0;
        scene.add(plane);

        // Y-axis labels
        const createLabel = (text, x, y, z) => {
            const canvas = document.createElement('canvas');
            canvas.width = 80;
            canvas.height = 28;
            const ctx = canvas.getContext('2d');
            ctx.font = '16px monospace';
            ctx.fillStyle = 'rgba(180, 190, 210, 0.7)';
            ctx.textAlign = 'right';
            ctx.fillText(text, 72, 20);
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.position.set(x, y, z);
            sprite.scale.set(2.8, 1, 1);
            scene.add(sprite);
        };

        [0, 500, 1000, 1500, 2000, 2500, 3000, 3500].forEach(val => {
            const y = (val / (maxVal || 3500)) * maxHeight;
            createLabel(String(val), -offsetX - 2, y, -offsetZ - 0.5);
        });

        // Single render — NO animation loop, NO rotation
        renderer.render(scene, camera);

        // Resize handler
        const handleResize = () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            renderer.render(scene, camera);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (rendererRef.current) {
                container.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
                rendererRef.current = null;
            }
        };
    }, [data]);

    return (
        <div
            ref={mountRef}
            style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                width: '480px',
                height: '360px',
                zIndex: 1000,
                pointerEvents: 'none',
                overflow: 'hidden',
            }}
        />
    );
}
