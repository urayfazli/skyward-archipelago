// Skyward Archipelago — the world: island terrain, ocean, runway, ring
// course, clouds and landmarks. The terrain height is an analytic function
// (a sum of smooth island bumps) shared by the mesh, the physics and the
// crash detection, so what you see is exactly what you can hit.

import { ISLANDS, RINGS, RUNWAY, WORLD } from './config.js';

const FLAT_RADIUS = 300; // the home island is flattened around the runway

export function terrainHeight(x, z) {
  let height = -26; // sea floor
  for (const island of ISLANDS) {
    const dx = x - island.x;
    const dz = z - island.z;
    const dist2 = dx * dx + dz * dz;
    const fall = Math.exp(-dist2 / (island.radius * island.radius));
    height += (island.height + 26) * fall;
  }
  // Gentle rolling detail away from the shore.
  height += Math.sin(x * 0.011) * Math.cos(z * 0.013) * 2.2;

  // Flatten a strip for the runway on the home island.
  const dxr = Math.abs(x - RUNWAY.x);
  const dzr = z - RUNWAY.z;
  if (dxr < FLAT_RADIUS && Math.abs(dzr) < FLAT_RADIUS) {
    const blend = Math.max(
      smoothstep(FLAT_RADIUS, 90, dxr),
      smoothstep(FLAT_RADIUS, 200, Math.abs(dzr)),
    );
    height = height * (1 - blend) + RUNWAY.elevation * blend;
  }
  return height;
}

function smoothstep(edgeFar, edgeNear, value) {
  const t = Math.max(0, Math.min(1, (edgeFar - value) / (edgeFar - edgeNear)));
  return t * t * (3 - 2 * t);
}

function terrainColor(height, slope) {
  // Sand at the shore, grass above it, rock on the steep and high ground.
  if (height < 2.5) return [0.93, 0.82, 0.58];
  if (slope > 0.55) return [0.45, 0.4, 0.38];
  if (height > 78) return [0.52, 0.5, 0.48];
  if (height > 34) return [0.3, 0.55, 0.28];
  return [0.36, 0.66, 0.3];
}

export function buildWorld(scene) {
  const world = { rings: [], ringMats: [] };

  scene.fog = new THREE.Fog(WORLD.fogColor, 1300, 6400);
  scene.background = new THREE.Color(WORLD.skyHorizon);

  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x8a6a44, 0.62);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(WORLD.sunColor, 1.6);
  sun.position.set(-1400, 950, -700);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -500; sun.shadow.camera.right = 500;
  sun.shadow.camera.top = 500; sun.shadow.camera.bottom = -500;
  sun.shadow.camera.far = 4200;
  scene.add(sun);
  world.sun = sun;

  buildSkyDome(scene);
  buildTerrain(scene);
  buildOcean(scene);
  buildRunway(scene);
  buildVegetation(scene);
  buildLighthouse(scene);
  buildClouds(scene, world);
  buildRings(scene, world);
  return world;
}

function buildSkyDome(scene) {
  const geo = new THREE.SphereGeometry(6000, 24, 12);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(WORLD.skyTop) },
      horizon: { value: new THREE.Color(WORLD.skyHorizon) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y * 1.6 + 0.18, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.75)), 1.0); }',
  });
  scene.add(new THREE.Mesh(geo, mat));
}

function buildTerrain(scene) {
  const segments = 150;
  const geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = terrainHeight(x, z);
    pos.setY(i, h);
    const ahead = terrainHeight(x + 14, z) - h;
    const side = terrainHeight(x, z + 14) - h;
    const slope = Math.min(1, Math.sqrt(ahead * ahead + side * side) / 14);
    const [r, g, b] = terrainColor(h, slope);
    colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function buildOcean(scene) {
  const geo = new THREE.PlaneGeometry(14000, 14000, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshLambertMaterial({
    color: 0x1d6f8e, transparent: true, opacity: 0.95,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = WORLD.seaLevel;
  scene.add(mesh);
}

function buildRunway(scene) {
  const y = RUNWAY.elevation + 0.25;
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(RUNWAY.width, 0.5, RUNWAY.length),
    new THREE.MeshLambertMaterial({ color: 0x3c4147 }),
  );
  strip.position.set(RUNWAY.x, y, RUNWAY.z);
  strip.receiveShadow = true;
  scene.add(strip);

  const paintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = -4; i <= 4; i++) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 26), paintMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(RUNWAY.x, y + 0.28, RUNWAY.z + i * 48);
    scene.add(dash);
  }
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffd34d });
  for (const sideSign of [-1, 1]) {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(1.6, RUNWAY.length), edgeMat);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(RUNWAY.x + sideSign * (RUNWAY.width / 2 - 1), y + 0.28, RUNWAY.z);
    scene.add(edge);
  }
  // Threshold numbers block: a bright pad pilots aim for on approach.
  const pad = new THREE.Mesh(
    new THREE.PlaneGeometry(RUNWAY.width - 8, 30),
    new THREE.MeshBasicMaterial({ color: 0xf5f0e6 }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(RUNWAY.x, y + 0.29, RUNWAY.z - RUNWAY.length / 2 + 18);
  scene.add(pad);
}

function buildVegetation(scene) {
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2b });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2c7a35 });
  const trunkGeo = new THREE.CylinderGeometry(0.7, 1.1, 7, 5);
  const leafGeo = new THREE.ConeGeometry(5.2, 13, 6);
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const island of ISLANDS) {
    const count = Math.floor(island.radius / 16);
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = rand() * island.radius * 0.72;
      const x = island.x + Math.cos(angle) * dist;
      const z = island.z + Math.sin(angle) * dist;
      if (Math.abs(x - RUNWAY.x) < 60 && Math.abs(z - RUNWAY.z) < 280) continue;
      const h = terrainHeight(x, z);
      if (h < 6 || h > 74) continue;
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(x, h + 3, z);
      scene.add(trunk);
      const leaves = new THREE.Mesh(leafGeo, leafMat);
      leaves.position.set(x, h + 12, z);
      leaves.castShadow = true;
      scene.add(leaves);
    }
  }
}

function buildLighthouse(scene) {
  const x = -1150; const z = 1050;
  const base = terrainHeight(x, z);
  const group = new THREE.Group();
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 8, 46, 10),
    new THREE.MeshLambertMaterial({ color: 0xf2ede2 }),
  );
  tower.position.y = 23;
  group.add(tower);
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(5.6, 6.4, 10, 10),
    new THREE.MeshLambertMaterial({ color: 0xc8402e }),
  );
  band.position.y = 30;
  group.add(band);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(4.2, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe98a }),
  );
  lamp.position.y = 50;
  group.add(lamp);
  group.position.set(x, base, z);
  scene.add(group);
}

function buildClouds(scene, world) {
  world.clouds = [];
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 });
  let seed = 31;
  const rand = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 26; i++) {
    const puff = new THREE.Group();
    const blobs = 3 + Math.floor(rand() * 3);
    for (let b = 0; b < blobs; b++) {
      const r = 26 + rand() * 42;
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
      sphere.position.set(b * 34 - blobs * 16, rand() * 10, rand() * 22 - 11);
      sphere.scale.y = 0.45;
      puff.add(sphere);
    }
    puff.position.set((rand() - 0.5) * 4200, 260 + rand() * 190, (rand() - 0.5) * 4200);
    scene.add(puff);
    world.clouds.push(puff);
  }
}

function buildRings(scene, world) {
  const geo = new THREE.TorusGeometry(26, 2.6, 10, 36);
  RINGS.forEach((ring, index) => {
    const mat = new THREE.MeshBasicMaterial({ color: 0x8d99a6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(ring.x, ring.y, ring.z);
    mesh.rotation.y = THREE.MathUtils.degToRad(ring.yaw);
    scene.add(mesh);
    world.rings.push(mesh);
    world.ringMats.push(mat);
    // A floating marker light above each ring so the course reads from far away.
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0 }),
    );
    beacon.position.set(ring.x, ring.y + 34, ring.z);
    scene.add(beacon);
    world.rings[index].userData.beacon = beacon;
  });
}

export function setRingStates(world, nextIndex, time) {
  world.rings.forEach((mesh, index) => {
    const mat = world.ringMats[index];
    if (index < nextIndex) {
      mat.color.setHex(0x39d353); // cleared: green
    } else if (index === nextIndex) {
      const pulse = 0.75 + Math.sin(time * 5) * 0.25;
      mat.color.setRGB(1.0 * pulse + 0.25, 0.72 * pulse + 0.15, 0.1); // next: glowing gold
      const scale = 1 + Math.sin(time * 5) * 0.045;
      mesh.scale.setScalar(scale);
    } else {
      mat.color.setHex(0x8d99a6); // ahead: grey
      mesh.scale.setScalar(1);
    }
  });
}
