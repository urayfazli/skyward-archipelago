// Skyward Archipelago — course and world configuration.
// Everything in this file is original: the archipelago layout, the ring
// course, the island names and the scoring rules were designed for this game.

export const WORLD = {
  size: 4200,            // terrain plane is size x size metres
  seaLevel: 0,
  fogColor: 0xe9b98d,    // warm haze at golden hour
  skyTop: 0x2e5f8a,
  skyHorizon: 0xffc98a,
  sunColor: 0xffe3b3,
};

// Each island is a smooth gaussian bump: x/z centre, radius, peak height.
// The analytic height function in world.js uses exactly these bumps, so the
// visual mesh and the collision/physics height always agree.
export const ISLANDS = [
  { name: 'Pulau Berangkat', x: 0,     z: 0,     radius: 620, height: 36 },
  { name: 'Pulau Karang',    x: -1250, z: -900,  radius: 430, height: 88 },
  { name: 'Pulau Cemara',    x: 1150,  z: -1150, radius: 470, height: 102 },
  { name: 'Pulau Ombak',     x: 1350,  z: 850,   radius: 390, height: 58 },
  { name: 'Pulau Senja',     x: -1150, z: 1050,  radius: 520, height: 118 },
  { name: 'Pulau Kecil',     x: 250,   z: -1650, radius: 260, height: 44 },
  { name: 'Pulau Jauh',      x: -350,  z: 1750,  radius: 300, height: 72 },
];

// The home runway sits on Pulau Berangkat, flat and pointing north (-z).
export const RUNWAY = {
  x: 0, z: -60, length: 460, width: 46, headingDeg: 0, elevation: 9.2,
};

// Ring course: fly them in order. Each ring has a centre and a facing yaw.
// Rings hang over water and island edges so the course tours the whole map.
export const RINGS = [
  { x: 0,     y: 95,  z: -620,  yaw: 0 },
  { x: -620,  y: 120, z: -1080, yaw: -38 },
  { x: -1250, y: 150, z: -820,  yaw: -95 },
  { x: -1420, y: 110, z: -120,  yaw: -160 },
  { x: -880,  y: 135, z: 620,   yaw: 155 },
  { x: -1150, y: 175, z: 1080,  yaw: 105 },
  { x: -350,  y: 120, z: 1620,  yaw: 55 },
  { x: 620,   y: 105, z: 1250,  yaw: 20 },
  { x: 1350,  y: 130, z: 820,   yaw: -35 },
  { x: 1180,  y: 165, z: -1080, yaw: -120 },
  { x: 420,   y: 120, z: -1420, yaw: -175 },
  { x: 60,    y: 100, z: -780,  yaw: 178 },
];

export const FLIGHT = {
  minSpeed: 0,
  maxSpeed: 118,          // m/s at full throttle
  cruiseSpeed: 46,
  throttleAccel: 26,      // m/s gained per second at full throttle
  drag: 0.0035,
  pitchRate: 1.05,        // rad/s
  rollRate: 1.9,
  yawFromRoll: 0.55,      // heading change induced by banking
  stallSpeed: 21,         // below this the nose drops and the plane sinks
  sinkRate: 9.5,
  startFuel: 100,
  fuelBurn: 1.15,         // per second at full throttle
  ringFuelBonus: 4,
  ringScore: 250,
  landingBonus: 800,
  cleanLandingBonus: 400,
};

export const SHOT_NAMES = ['cover', 'rings', 'runway', 'islands'];
