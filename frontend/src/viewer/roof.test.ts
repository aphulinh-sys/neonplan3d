import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyBuilding, newFloor, type Room } from "../model.ts";
import { buildRoof, roofFloor } from "./roof.ts";

const rect = (id: string, x1: number, z1: number): Room => ({ id, name: id, area_id: null, points: [[0, 0], [x1, 0], [x1, z1], [0, z1]], floor_material: "wood" });

function house(type: "none" | "flat" | "gable") {
  const b = emptyBuilding();
  b.floors = [
    { ...newFloor("eg", "EG", 0), rooms: [rect("a", 10, 8)] },
    { ...newFloor("og", "OG", 2.75), rooms: [rect("b", 10, 8)] },
    { ...newFloor("dg", "Dachboden", 5.5) },
  ];
  b.settings.roof = { type, pitch: 45, overhang: 0.5 };
  return b;
}

test("the roof sits on the highest floor with rooms", () => {
  assert.equal(roofFloor(house("gable"))?.id, "og");
  assert.equal(buildRoof(house("none")), null);
});

test("a gable roof rises to half the house depth times the slope", () => {
  const roof = buildRoof(house("gable"))!;
  const p = roof.solid.p;
  let top = -Infinity;
  for (let i = 1; i < p.length; i += 3) top = Math.max(top, p[i]);
  // 8 m deep + 2 × (0.24 wall + 0.5 overhang) = 9.48 m; half of it at 45° rises as much
  assert.ok(Math.abs(top - 9.48 / 2) < 1e-6, `ridge at ${top}`);
  assert.ok(buildRoof(house("flat"))!.solid.count > 0);
});

test("a gable ridge runs along the long side by default and along the short side when set", () => {
  const ridgeAxis = (ridge?: "long" | "short") => {
    const b = house("gable");
    if (ridge) b.settings.roof.ridge = ridge;
    const p = buildRoof(b)!.solid.p;
    let top = -Infinity;
    for (let i = 1; i < p.length; i += 3) top = Math.max(top, p[i]);
    // the points at ridge height spread along the ridge axis only
    const xs: number[] = [];
    const zs: number[] = [];
    for (let i = 0; i < p.length; i += 3) {
      if (Math.abs(p[i + 1] - top) < 1e-6) {
        xs.push(p[i]);
        zs.push(p[i + 2]);
      }
    }
    const spread = (v: number[]) => Math.max(...v) - Math.min(...v);
    return { x: spread(xs), z: spread(zs), top };
  };
  // the house is 10 m wide (x) and 8 m deep (z), plus 0.74 m on each side
  const long = ridgeAxis();
  assert.ok(long.x > 11 && long.z < 1e-6, `default ridge ${JSON.stringify(long)}`);
  assert.deepEqual(ridgeAxis("long"), long);
  const short = ridgeAxis("short");
  assert.ok(short.z > 9 && short.x < 1e-6, `short ridge ${JSON.stringify(short)}`);
  // across the 11.48 m wide side at 45° the ridge rises to half of it
  assert.ok(Math.abs(short.top - 11.48 / 2) < 1e-6, `ridge at ${short.top}`);
});
