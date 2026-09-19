import {
  makeRoute,
  makeStationRoute,
  sampleRoute,
  START_Z,
  TILE_LENGTH,
  JUNCTION_LENGTH,
} from "./railway-motion.mjs";

export const CRUISE_SPEED = 18;
const ACCELERATION_TIME = 1.2;
const EXTENSION_LENGTH = 40;
// A fast reply and point movement fit in the short normal straight.
const WAITING_MARGIN = 16;

export class RailwayJourney {
  constructor(rounds) {
    this.rounds = rounds;
    this.origins = Array.from({ length: rounds }, (_, i) => ({
      x: 0,
      z: -i * TILE_LENGTH,
    }));
    this.routes = Array(rounds).fill(null);
    this.physicalIndex = 0;
    this.distance = 0;
    this.totalDistance = 0;
    this.elapsed = 0;
    this.started = false;
    this.station = false;
    this.arrived = false;
    this.speed = 0;
    this.stationTime = 0;
    this.stationRoute = makeStationRoute(rounds);
  }
  lock(index, choice) {
    if (this.routes[index]) return;
    this.routes[index] = makeRoute(
      choice,
      this.origins[index],
      index === this.rounds - 1 ? JUNCTION_LENGTH : TILE_LENGTH,
    );
  }
  start() {
    if (this.routes[0]) this.started = true;
  }
  extend() {
    const route = this.routes[this.physicalIndex];
    const end = route.points.at(-1);
    const extension = {
      afterIndex: this.physicalIndex,
      fromZ: end.z,
      toZ: end.z - EXTENSION_LENGTH,
      amount: EXTENSION_LENGTH,
    };
    route.points.push({
      x: 0,
      z: extension.toZ,
      distance: route.length + EXTENSION_LENGTH,
    });
    route.length += EXTENSION_LENGTH;
    for (let i = this.physicalIndex + 1; i < this.rounds; i++) {
      this.origins[i].z -= EXTENSION_LENGTH;
      if (this.routes[i])
        for (const p of this.routes[i].points) p.z -= EXTENSION_LENGTH;
    }
    for (const p of this.stationRoute.points) p.z -= EXTENSION_LENGTH;
    this.stationRoute.bufferZ -= EXTENSION_LENGTH;
    return extension;
  }
  snapshot(extension = null) {
    const route = this.station
      ? this.stationRoute
      : this.routes[this.physicalIndex];
    const pose = route
      ? sampleRoute(route, this.distance)
      : { position: { x: 0, z: START_Z }, tangent: { x: 0, z: -1 } };
    return {
      ...pose,
      speed: this.speed,
      totalDistance: this.totalDistance,
      physicalIndex: this.physicalIndex,
      station: this.station,
      arrived: this.arrived,
      extension,
    };
  }
  step(dt) {
    if (!this.started || this.arrived || dt <= 0) return this.snapshot();
    let extension = null;
    if (
      !this.station &&
      this.physicalIndex < this.rounds - 1 &&
      !this.routes[this.physicalIndex + 1] &&
      this.routes[this.physicalIndex].length - this.distance < WAITING_MARGIN
    )
      extension = this.extend();
    if (this.station) this.brake(dt);
    else {
      const before = this.elapsed;
      this.elapsed += dt;
      const integral = (t) =>
        t < ACCELERATION_TIME
          ? (CRUISE_SPEED * t * t) / (2 * ACCELERATION_TIME)
          : CRUISE_SPEED * (t - ACCELERATION_TIME / 2);
      let travel = integral(this.elapsed) - integral(before);
      this.speed = CRUISE_SPEED * Math.min(this.elapsed / ACCELERATION_TIME, 1);
      while (travel > 0) {
        const route = this.routes[this.physicalIndex];
        const remaining = route.length - this.distance;
        if (travel < remaining) {
          this.distance += travel;
          this.totalDistance += travel;
          break;
        }
        this.totalDistance += remaining;
        travel -= remaining;
        this.distance = 0;
        if (this.physicalIndex === this.rounds - 1) {
          this.station = true;
          this.brake(travel / CRUISE_SPEED);
          break;
        }
        // Usually extended far before this point; also handle a large time step.
        if (!this.routes[this.physicalIndex + 1]) {
          this.distance = route.length;
          extension = this.extend();
        } else this.physicalIndex++;
      }
    }
    return this.snapshot(extension);
  }
  brake(dt) {
    const duration = (2 * this.stationRoute.length) / CRUISE_SPEED;
    const before = this.distance;
    this.stationTime = Math.min(duration, this.stationTime + dt);
    const t = this.stationTime;
    this.distance = CRUISE_SPEED * (t - (t * t) / (2 * duration));
    this.totalDistance += this.distance - before;
    this.speed = CRUISE_SPEED * (1 - t / duration);
    if (t >= duration) {
      this.arrived = true;
      this.speed = 0;
    }
  }
}
