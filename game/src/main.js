// Skyward Archipelago — game entry point.
// Fly the Senja Skimmer through all twelve rings of the archipelago course,
// then come home and land on the runway for the landing bonus. Watch the
// fuel: rings top it up a little, only a landing refills the tank.

import { RINGS, FLIGHT } from './config.js';
import { Input } from './input.js';
import { SoundEngine } from './audio.js';
import { buildWorld, setRingStates, terrainHeight } from './world.js';
import { buildAircraft, FlightModel } from './aircraft.js';
import { Hud } from './hud.js';
import { setupShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

const container = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 9000);
camera.position.set(0, 30, 320);

const world = buildWorld(scene);
const aircraftMesh = buildAircraft();
scene.add(aircraftMesh);

const flight = new FlightModel();
const input = new Input(renderer.domElement);
const sound = new SoundEngine();
const hud = new Hud();

const game = {
  state: shotName ? 'flying' : 'title',
  score: 0,
  ringsCleared: 0,
  ringsTotal: RINGS.length,
  elapsed: 0,
  finished: false,
  message: '',
};

const titleScreen = document.getElementById('title-screen');
const endScreen = document.getElementById('end-screen');
const endTitle = document.getElementById('end-title');
const endDetail = document.getElementById('end-detail');

if (shotName) {
  setupShot(shotName, flight, game);
  titleScreen.style.display = 'none';
} else {
  flight.position.set(0, 14, 210);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function startFlight() {
  flight.reset();
  game.score = 0;
  game.ringsCleared = 0;
  game.elapsed = 0;
  game.finished = false;
  game.state = 'flying';
  titleScreen.style.display = 'none';
  endScreen.style.display = 'none';
  sound.start();
  hud.showBanner('THROTTLE UP — SHIFT, THEN PULL UP WITH W', 3.2);
}

function endFlight(title, detail) {
  game.state = 'ended';
  endTitle.textContent = title;
  endDetail.textContent = detail;
  endScreen.style.display = 'flex';
}

function checkRingPass() {
  const next = RINGS[game.ringsCleared];
  if (!next) return;
  const dx = flight.position.x - next.x;
  const dy = flight.position.y - next.y;
  const dz = flight.position.z - next.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < 27) {
    game.ringsCleared += 1;
    game.score += FLIGHT.ringScore;
    flight.fuel = Math.min(100, flight.fuel + FLIGHT.ringFuelBonus);
    sound.ringChime();
    if (game.ringsCleared >= RINGS.length) {
      hud.showBanner('ALL RINGS CLEAR — LAND AT HOME RUNWAY FOR THE BONUS', 4);
    } else {
      hud.showBanner('RING ' + game.ringsCleared + ' OF ' + RINGS.length + ' — +' + FLIGHT.ringScore, 1.8);
    }
  }
}

function updateGame(dt) {
  if (game.state !== 'flying') return;
  game.elapsed += dt;
  const wasOnGround = flight.onGround;
  flight.update(dt, input);
  checkRingPass();

  const contact = flight.checkGroundContact();
  if (contact === 'crashed') {
    sound.crash();
    endFlight('CRASHED', 'The Skimmer went down with ' + game.ringsCleared + ' of ' +
      RINGS.length + ' rings. Score ' + game.score + '. Press Enter to fly again.');
    return;
  }
  if (contact === 'landed') {
    sound.touchdown();
    flight.fuel = 100;
    if (game.ringsCleared >= RINGS.length && !game.finished) {
      game.finished = true;
      game.score += FLIGHT.landingBonus + FLIGHT.cleanLandingBonus;
      sound.finishFanfare();
      endFlight('COURSE COMPLETE!',
        'All ' + RINGS.length + ' rings and a clean home landing in ' +
        Math.floor(game.elapsed / 60) + ':' + (Math.floor(game.elapsed) % 60).toString().padStart(2, '0') +
        '. Final score ' + game.score + '. Press Enter to fly again.');
    } else {
      hud.showBanner('TOUCHDOWN — REFUELLED. TAKE OFF AGAIN WHEN READY', 2.6);
    }
    return;
  }
  if (wasOnGround && !flight.onGround) {
    hud.showBanner('AIRBORNE — CHASE THE GOLD RING', 1.8);
  }
  sound.setEngine(flight.throttle, flight.speed / FLIGHT.maxSpeed, true);
}

const cameraTarget = new THREE.Vector3();
const cameraPos = new THREE.Vector3(0, 30, 320);
function updateCamera(dt) {
  const back = new THREE.Vector3(0, 0, 1).applyQuaternion(flight.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(flight.quaternion);
  const desired = flight.position.clone()
    .addScaledVector(back, 17)
    .addScaledVector(up, 5.5);
  // Never let the chase camera sink under the terrain.
  const minY = terrainHeight(desired.x, desired.z) + 3.5;
  if (desired.y < minY) desired.y = minY;
  const blend = shotName ? 1 : 1 - Math.pow(0.0001, dt);
  cameraPos.lerp(desired, Math.min(1, blend));
  camera.position.copy(cameraPos);
  cameraTarget.copy(flight.position).addScaledVector(back, -30);
  camera.up.copy(up.lerp(new THREE.Vector3(0, 1, 0), 0.55).normalize());
  camera.lookAt(cameraTarget);

  // Keep the sun (and its shadow box) near the plane.
  world.sun.position.set(flight.position.x - 1400, 950, flight.position.z - 700);
  world.sun.target.position.copy(flight.position);
  world.sun.target.updateMatrixWorld();
}

let lastTime = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (shotName) dt = 0.016; // staged moment: a fixed step so poses hold still

  if (game.state === 'title' || game.state === 'ended') {
    if (input.consumeAnyKey() || input.down('Enter')) {
      if (game.state === 'title' || input.down('Enter')) startFlight();
    }
  }
  if (!shotName) updateGame(dt);
  else flight.position.y += 0; // staged: keep the posed flight values for the HUD

  aircraftMesh.position.copy(flight.position);
  aircraftMesh.quaternion.copy(flight.quaternion);
  aircraftMesh.userData.prop.rotation.z -= dt * (4 + flight.throttle * 55);

  for (const cloud of world.clouds) {
    cloud.position.x += dt * 2.2;
    if (cloud.position.x > 2400) cloud.position.x = -2400;
  }
  setRingStates(world, game.ringsCleared, now / 1000);
  updateCamera(dt);
  hud.update(dt, flight, game);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
