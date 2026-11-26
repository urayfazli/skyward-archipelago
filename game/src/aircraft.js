// Skyward Archipelago — the aircraft: a small original propeller plane built
// from primitives (the "Senja Skimmer"), plus its arcade flight model.
// Throttle and turn discipline matter: bank to turn, keep speed up or stall,
// and bleed speed with the brake before you try to land.

import { FLIGHT } from './config.js';
import { terrainHeight } from './world.js';

export function buildAircraft() {
  const group = new THREE.Group();
  const paint = new THREE.MeshPhongMaterial({ color: 0xe8641c, shininess: 60 });
  const cream = new THREE.MeshPhongMaterial({ color: 0xf7ead2, shininess: 40 });
  const dark = new THREE.MeshPhongMaterial({ color: 0x22303c, shininess: 90 });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.72, 8.6, 12), paint);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.castShadow = true;
  group.add(fuselage);

  const nose = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.05, 1.1, 12), dark);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = -4.7;
  group.add(nose);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.02, 12, 10),
    new THREE.MeshPhongMaterial({ color: 0x9fd8ef, shininess: 140, specular: 0xffffff }));
  canopy.scale.set(0.82, 0.62, 1.9);
  canopy.position.set(0, 0.78, -0.6);
  group.add(canopy);

  const wing = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.28, 1.9), cream);
  wing.position.set(0, -0.15, -0.9);
  wing.castShadow = true;
  group.add(wing);
  const wingStripeL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 1.92), paint);
  wingStripeL.position.set(-5.4, -0.15, -0.9);
  group.add(wingStripeL);
  const wingStripeR = wingStripeL.clone();
  wingStripeR.position.x = 5.4;
  group.add(wingStripeR);

  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.22, 1.3), cream);
  tailWing.position.set(0, 0.35, 4.1);
  group.add(tailWing);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.9, 1.4), paint);
  fin.position.set(0, 1.05, 4.1);
  group.add(fin);

  const prop = new THREE.Group();
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0x2b2b2b });
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.25, 0.08), bladeMat);
    blade.position.y = 0.78;
    const holder = new THREE.Group();
    holder.rotation.z = (i / 3) * Math.PI * 2;
    holder.add(blade);
    prop.add(holder);
  }
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.0, 10), paint);
  spinner.rotation.x = -Math.PI / 2;
  prop.add(spinner);
  prop.position.z = -5.45;
  group.add(prop);
  group.userData.prop = prop;

  const gearMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.34, 10);
  for (const sx of [-1.7, 1.7]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.5, 6), gearMat);
    strut.position.set(sx, -1.15, -0.8);
    group.add(strut);
    const wheel = new THREE.Mesh(wheelGeo, gearMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(sx, -1.95, -0.8);
    group.add(wheel);
  }
  const tailWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 8), gearMat);
  tailWheel.rotation.z = Math.PI / 2;
  tailWheel.position.set(0, -0.72, 4.0);
  group.add(tailWheel);

  return group;
}

export class FlightModel {
  constructor() {
    this.reset();
  }

  reset() {
    // Parked at the south end of the runway, facing north, ready to roll.
    this.position = new THREE.Vector3(0, 12.4, 160);
    this.quaternion = new THREE.Quaternion();
    this.speed = 0;
    this.throttle = 0;
    this.fuel = FLIGHT.startFuel;
    this.onGround = true;
    this.crashed = false;
    this.stalled = false;
    this.verticalSpeed = 0;
    this.headingDeg = 0;
    this.pitchDeg = 0;
    this.rollDeg = 0;
  }

  update(dt, input) {
    if (this.crashed) return;
    const axes = input.axes();
    this.throttle = Math.max(0, Math.min(1, this.throttle + input.throttleDelta() * dt));

    // Orientation: pitch around local X, roll around local Z, bank turns.
    const pitchInput = axes.pitch * FLIGHT.pitchRate * dt * (this.onGround ? 0.25 : 1);
    const rollInput = axes.roll * FLIGHT.rollRate * dt;
    const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchInput);
    const qRoll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -rollInput);
    this.quaternion.multiply(qPitch).multiply(qRoll);

    const euler = new THREE.Euler().setFromQuaternion(this.quaternion, 'YXZ');
    this.rollDeg = THREE.MathUtils.radToDeg(euler.z);
    this.pitchDeg = THREE.MathUtils.radToDeg(euler.x);
    if (!this.onGround) {
      const yawRate = -Math.sin(THREE.MathUtils.degToRad(this.rollDeg)) * FLIGHT.yawFromRoll;
      const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawRate * dt);
      this.quaternion.premultiply(qYaw);
    }

    // Speed: throttle pushes, drag and climb bleed it, dives feed it.
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
    const climbFactor = forward.y; // positive when the nose points up
    let accel = this.throttle * FLIGHT.throttleAccel;
    accel -= this.speed * this.speed * FLIGHT.drag;
    accel -= climbFactor * 13.5;
    if (input.brakeHeld()) accel -= 14;
    this.speed = Math.max(0, Math.min(FLIGHT.maxSpeed, this.speed + accel * dt));
    if (this.onGround && this.throttle < 0.02 && this.speed < 2) this.speed = 0;

    // Stall: too slow in the air and the nose drops, the plane sinks.
    this.stalled = !this.onGround && this.speed < FLIGHT.stallSpeed;
    if (this.stalled) {
      const drop = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.55 * dt);
      this.quaternion.multiply(drop);
    }

    const velocity = forward.clone().multiplyScalar(this.speed);
    if (this.stalled) velocity.y -= FLIGHT.sinkRate;
    if (!this.onGround) velocity.y -= 1.6 * dt * 60 * 0.016; // gentle gravity bleed
    const prevY = this.position.y;
    this.position.addScaledVector(velocity, dt);
    this.verticalSpeed = dt > 0 ? (this.position.y - prevY) / dt : 0;

    // Fuel burns with throttle; an empty tank means a gliding descent.
    this.fuel = Math.max(0, this.fuel - FLIGHT.fuelBurn * (0.25 + this.throttle) * dt);
    if (this.fuel <= 0) this.throttle = 0;

    // Keep the plane inside the archipelago.
    const limit = 2600;
    this.position.x = Math.max(-limit, Math.min(limit, this.position.x));
    this.position.z = Math.max(-limit, Math.min(limit, this.position.z));
    this.position.y = Math.min(620, this.position.y);

    const groundY = terrainHeight(this.position.x, this.position.z);
    this.groundClearance = this.position.y - groundY;
    this.headingDeg = (THREE.MathUtils.radToDeg(Math.atan2(-forward.x, -forward.z)) + 360) % 360;

    if (this.onGround) this.handleGroundRoll(groundY);
  }

  handleGroundRoll(groundY) {
    const runwayHere = this.onRunway();
    const floorY = (runwayHere ? 9.45 : groundY) + 2.15;
    this.position.y = floorY;
    if (this.speed > FLIGHT.stallSpeed + 6 && this.pitchDeg < -4) {
      this.onGround = false; // rotated off the ground
    }
  }

  onRunway() {
    return Math.abs(this.position.x) < 23 && Math.abs(this.position.z + 60) < 230;
  }

  // Returns 'landed' | 'crashed' | null after a ground contact in the air.
  checkGroundContact() {
    if (this.onGround || this.crashed) return null;
    const groundY = terrainHeight(this.position.x, this.position.z);
    const floorY = groundY + 2.15;
    if (this.position.y > floorY) return null;

    const gentle = Math.abs(this.verticalSpeed) < 6.5 && Math.abs(this.rollDeg) < 14;
    if (this.onRunway() && gentle && this.speed < 62) {
      this.onGround = true;
      this.position.y = 9.45 + 2.15;
      // Level the plane onto the strip.
      const euler = new THREE.Euler(0, THREE.MathUtils.degToRad(this.headingDeg > 180 ? 180 : 0) * 0, 0);
      this.quaternion.setFromEuler(euler);
      return 'landed';
    }
    this.crashed = true;
    this.position.y = floorY;
    return 'crashed';
  }
}
