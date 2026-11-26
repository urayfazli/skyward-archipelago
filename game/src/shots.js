// Skyward Archipelago — deterministic screenshot setups.
// Opening the game with ?shot=<name> freezes one staged moment so the maker
// can capture real renders of the game for screenshots/. The game itself is
// untouched: these are positions the plane can genuinely reach in play.

function pose(flight, x, y, z, headingDeg, pitchDeg, rollDeg) {
  flight.position.set(x, y, z);
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(pitchDeg),
    THREE.MathUtils.degToRad(headingDeg),
    THREE.MathUtils.degToRad(rollDeg),
    'YXZ',
  );
  flight.quaternion.setFromEuler(euler);
  flight.onGround = false;
  flight.headingDeg = (headingDeg + 360) % 360;
  flight.pitchDeg = pitchDeg;
  flight.rollDeg = rollDeg;
  flight.verticalSpeed = pitchDeg < 0 ? 2.4 : -1.8;
  flight.groundClearance = 30;
}

export function setupShot(name, flight, game) {
  game.state = 'flying';
  flight.fuel = 76;
  flight.throttle = 0.72;

  if (name === 'rings') {
    // Banking left through the course over Pulau Senja, four rings down.
    pose(flight, -690, 146, 452, 136, -3, -22);
    flight.speed = 58;
    game.ringsCleared = 4;
    game.score = 1000;
    game.elapsed = 96;
  } else if (name === 'runway') {
    // On final approach to the home runway, gear down, lining up the numbers.
    pose(flight, 10, 40, 318, 2, 4, 3);
    flight.speed = 34;
    flight.throttle = 0.34;
    flight.fuel = 41;
    game.ringsCleared = 12;
    game.score = 3000;
    game.elapsed = 284;
  } else if (name === 'islands') {
    // Cruising high over the strait with Pulau Senja and its lighthouse ahead.
    pose(flight, -420, 235, 420, 138, -2, -12);
    flight.speed = 66;
    game.ringsCleared = 8;
    game.score = 2000;
    game.elapsed = 187;
  } else {
    // 'cover' (and the default): climbing away from the home island toward
    // the first glowing ring, the whole course opening up ahead.
    pose(flight, 95, 103, -452, 24, -7, -16);
    flight.speed = 54;
    game.ringsCleared = 0;
    game.score = 0;
    game.elapsed = 23;
  }
  return name;
}
