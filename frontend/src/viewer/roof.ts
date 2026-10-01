// Roof over the top floor: flat or gable, over the floor's outline (bounding box of its rooms plus the
// outer walls and the overhang). Drawn in the house view only; the viewer lifts and fades it out when
// the camera zooms in.

import { Color } from "three";
import type { Building, Floor } from "../model.ts";
import { DEG, GeoBuffer, LineBuffer, pushPrism, shade } from "./geo.ts";

const ROOF = 0x1a2338;
const ROOF_TOP = 0x222d48;
const GABLE = 0x141d31;
const RIDGE = shade(0x37e0ff, 0.9);
const EAVE = shade(0x5b7cff, 0.45);
const THICK = 0.14;

export interface RoofGeometry {
  floor: Floor;
  solid: GeoBuffer;
  lines: LineBuffer;
}

/** The floor the roof sits on: the highest one with rooms. */
export function roofFloor(b: Building): Floor | null {
  const withRooms = b.floors.filter((f) => f.rooms.some((r) => r.points.length >= 3));
  return withRooms.sort((p, q) => q.elevation - p.elevation)[0] ?? null;
}

/** Roof geometry in floor coordinates, with y = 0 at the top of the floor's walls. */
export function buildRoof(b: Building): RoofGeometry | null {
  const roof = b.settings.roof;
  const floor = roofFloor(b);
  if (!floor || !roof || roof.type === "none") return null;
  const xs = floor.rooms.flatMap((r) => r.points.map((p) => p[0]));
  const zs = floor.rooms.flatMap((r) => r.points.map((p) => p[1]));
  const m = b.settings.wall_exterior + roof.overhang;
  const x0 = Math.min(...xs) - m;
  const x1 = Math.max(...xs) + m;
  const z0 = Math.min(...zs) - m;
  const z1 = Math.max(...zs) + m;
  const solid = new GeoBuffer();
  const lines = new LineBuffer();
  if (roof.type === "flat") {
    pushPrism(solid, [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], 0, 0.25, ROOF, ROOF_TOP, { bottom: true });
    const e = 0.252;
    for (const [a, c] of [
      [[x0, z0], [x1, z0]],
      [[x1, z0], [x1, z1]],
      [[x1, z1], [x0, z1]],
      [[x0, z1], [x0, z0]],
    ]) {
      lines.seg([a[0], e, a[1]], [c[0], e, c[1]], RIDGE);
      lines.seg([a[0], 0, a[1]], [c[0], 0, c[1]], EAVE);
    }
    return { floor, solid, lines };
  }
  // gable: the ridge runs along the longer side, or along the shorter one when asked for
  const longerX = x1 - x0 >= z1 - z0;
  const alongX = roof.ridge === "short" ? !longerX : longerX;
  const half = (alongX ? z1 - z0 : x1 - x0) / 2;
  const rise = half * Math.tan(roof.pitch * DEG);
  // coordinates: u along the ridge, v across (from -half to +half)
  const P = (u: number, v: number, y: number): number[] => (alongX ? [u, y, (z0 + z1) / 2 + v] : [(x0 + x1) / 2 + v, y, u]);
  const [u0, u1] = alongX ? [x0, x1] : [z0, z1];
  const top = new Color(ROOF_TOP);
  const under = new Color(ROOF);
  const quad = (a: number[], b2: number[], c: number[], d: number[], col: Color) => {
    solid.tri(a, b2, c, col);
    solid.tri(a, c, d, col);
  };
  for (const side of [-1, 1]) {
    // upper and lower face of the slope, and the eave and rake faces of its thickness
    quad(P(u0, side * half, 0), P(u1, side * half, 0), P(u1, 0, rise), P(u0, 0, rise), top);
    quad(P(u0, side * half, -THICK), P(u0, 0, rise - THICK), P(u1, 0, rise - THICK), P(u1, side * half, -THICK), under);
    quad(P(u0, side * half, -THICK), P(u1, side * half, -THICK), P(u1, side * half, 0), P(u0, side * half, 0), under);
    for (const u of [u0, u1]) quad(P(u, side * half, -THICK), P(u, side * half, 0), P(u, 0, rise), P(u, 0, rise - THICK), under);
    lines.seg(P(u0, side * half, 0), P(u1, side * half, 0), EAVE);
    for (const u of [u0, u1]) lines.seg(P(u, side * half, 0), P(u, 0, rise), EAVE);
  }
  // gable walls above the outer walls (set back by the overhang)
  const inset = roof.overhang;
  const g = new Color(GABLE);
  const hw = half - inset;
  const rw = hw * Math.tan(roof.pitch * DEG);
  for (const u of [u0 + inset, u1 - inset]) {
    solid.tri(P(u, -hw, -THICK), P(u, hw, -THICK), P(u, 0, rw - THICK), g);
    solid.tri(P(u, hw, -THICK), P(u, -hw, -THICK), P(u, 0, rw - THICK), g);
  }
  lines.seg(P(u0, 0, rise + 0.004), P(u1, 0, rise + 0.004), RIDGE);
  return { floor, solid, lines };
}
