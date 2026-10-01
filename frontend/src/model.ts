// Data model shared by editor, 3D view and backend (see custom_components/neonplan3d/schema.py).
// Units are metres; x grows to the right, z grows downwards (as in the 2D editor).

import { packItem } from "./packs.ts";
import type { LampModel } from "./viewer/viewer3d.ts";

export type Vec2 = [number, number];

export interface Room {
  id: string;
  name: string;
  area_id: string | null;
  points: Vec2[];
  floor_material: string;
  /** Entities shown in the room's panel although they are not in the plan. */
  panel?: string[];
}

export type OpeningType = "door" | "window" | "garage";

/** Entity link of an opening: null = assigned automatically by area, "none" = no entity. */
export type EntityRef = string | null;

export interface Opening {
  id: string;
  room_id: string;
  /** Room edge the opening sits on (points[edge] -> points[edge + 1]). */
  edge: number;
  /** Distance of the opening's centre from points[edge] (metres). */
  offset: number;
  width: number;
  type: OpeningType;
  /** Height of the bottom above the floor; 0 for doors, garage doors and terrace doors. */
  sill: number;
  height: number;
  /** Hinge as seen from the room; with two leaves, the side of the main leaf. */
  hinge: "left" | "right";
  /** One leaf, or two (double door, French window) opening from the middle. */
  leaves: 1 | 2;
  /** Doors swing into their room ("in") or to the other side ("out"). */
  swing: "in" | "out";
  /** Look of the door or window (null = automatic: a front door in an exterior wall, else a room door). */
  style?: OpeningStyle | null;
  /** Contact of the second leaf (null = none). */
  contact2: string | null;
  /** Windows: which sensors report the sash (null: a contact, plus a tilt sensor when one is set). */
  sensor?: "contact" | "handle" | "contact_tilt" | null;
  /** The same for the second leaf of a double window, with its own tilt sensor. */
  sensor2?: "contact" | "handle" | "contact_tilt" | null;
  tilt2?: string | null;
  /** A sensor reporting the blind's position while it moves (covers that only report at the end). */
  position?: string | null;
  /** The position sensor counts the other way round (0 = open). */
  position_inverted?: boolean;
  cover: EntityRef;
  contact: EntityRef;
  tilt: EntityRef;
}

/** A picture rule of a screen: while `entity` is in `state`, the stored image (or a URL) is shown. */
export interface ScreenPicture {
  entity: string;
  /** Compare this attribute (e.g. app_name) instead of the state. */
  attribute?: string | null;
  /** The value to match: exact, or contained in the value's text ("youtube" in "com.google.android.youtube.tv"); "*" = any. */
  state: string;
  /** An image id of the image store, or an http(s) URL. */
  image: string;
}

export interface Furniture {
  id: string;
  type: string;
  x: number;
  z: number;
  rotation: number;
  w: number;
  d: number;
  h: number;
  variant: string | null;
  /** Linked entity, e.g. the TV's media player (null = automatic, "none" = none). */
  entity?: EntityRef;
  /** Power sensor (null = automatic: the linked entity's device or a matching name). */
  power?: EntityRef;
  /** Smart fridge: door sensors of the left (freezer) and right (fridge) door; the doors open in 3D while they report open. */
  door_left?: EntityRef;
  door_right?: EntityRef;
  /** Ask before switching the linked entity. */
  confirm?: boolean;
  /** Height of the bottom edge above the floor (null = default: the floor, a pack item's mount, a surface below). */
  mount_y?: number | null;
  /** Screens: pictures shown while an entity is in a state (first match wins; "*" = any state). */
  pictures?: ScreenPicture[];
  /** Screens: what shows around a rule picture – a dark screen (default) or a white one (for dark logos). */
  screen_bg?: "black" | "white";
  /** Parking spots: the vehicle shown (a pack item type) while `entity` reports a car. */
  vehicle?: string | null;
  /** Parking spots: size factor of the vehicle (1 = the pack item's size). */
  scale?: number;
  /** Parking spots: a sensor naming the kind of vehicle, and which vehicle each state means. */
  type_entity?: string | null;
  types?: { state: string; vehicle: string }[];
}

export type LampMount = "ceiling" | "floor" | "table" | "wall";

export interface Placement {
  entity_id: string;
  x: number;
  z: number;
  /** Height above the floor; null = default for the device kind (and lamp mount). */
  y: number | null;
  /** Lights: how the lamp is mounted; null = ceiling. */
  mount?: LampMount | null;
  /** Turn around the vertical axis (degrees): wall lamps, spots, displays face that way. */
  rotation?: number;
  /** Cameras: opening angle of the field of view (degrees) and how far it reaches (m); null = default. */
  fov?: number | null;
  reach?: number | null;
  /** Cameras: how far it looks down (degrees below the horizon; null = 20° on a wall, 65° as a dome). */
  tilt?: number | null;
  /** Ask before switching this device (3D tap, quick menu, room panel). */
  confirm?: boolean;
}

export interface Background {
  image_id: string;
  x: number;
  z: number;
  width: number;
  opacity: number;
}

export interface Floor {
  id: string;
  name: string;
  elevation: number;
  height: number;
  cut_height: number;
  rooms: Room[];
  openings: Opening[];
  furniture: Furniture[];
  placements: Placement[];
  background: Background | null;
  outdoor: OutdoorArea[];
  /** Free-standing walls (a partition through half a room); room walls come from the room edges. */
  walls?: FreeWall[];
  /** Linked floor of Home Assistant's floor registry. */
  ha_floor: string | null;
}

/** A wall drawn on its own, from a to b along its centre line. */
export interface FreeWall {
  id: string;
  a: Vec2;
  b: Vec2;
  /** Thickness in metres (null = the interior wall thickness of the settings). */
  thickness?: number | null;
}

export type RoofType = "none" | "flat" | "gable";

/** Which side of the floor outline a gable roof's ridge runs along. */
export type RidgeDirection = "long" | "short";

export interface RoofSettings {
  type: RoofType;
  /** Slope of a gable roof in degrees. */
  pitch: number;
  /** How far the roof reaches beyond the outer walls (metres). */
  overhang: number;
  /** Ridge of a gable roof along the longer (default) or the shorter side, e.g. for terraced houses. */
  ridge?: RidgeDirection;
}

export interface BuildingSettings {
  wall_exterior: number;
  wall_interior: number;
  grid: number;
  /** Direction of north in the plan, degrees clockwise from "up" (for the sun). */
  north: number;
  roof: RoofSettings;
  /** The weather entity shown outside the house (null = the first one). */
  weather_entity?: string | null;
  /** Which weather effects the 3D view shows (null = all but fog). */
  weather_effects?: WeatherEffect[] | null;
}

export const WEATHER_EFFECTS = ["rain", "snow", "fog", "clouds", "lightning", "sky"] as const;
export type WeatherEffect = (typeof WEATHER_EFFECTS)[number];
/** The effects shown when the plan does not say: everything but fog (fog greys the whole scene). */
export const DEFAULT_WEATHER_EFFECTS: WeatherEffect[] = ["rain", "snow", "clouds", "lightning", "sky"];

export const OUTDOOR_TYPES = ["lawn", "terrace", "path", "driveway", "pool", "bed", "hedge", "fence"] as const;
export type OutdoorType = (typeof OUTDOOR_TYPES)[number];

/** Top of each kind of outdoor area above ground level (pool: its water, below). */
export const OUTDOOR_TOP: Record<OutdoorType, number> = {
  lawn: 0.012,
  terrace: 0.12,
  path: 0.02,
  driveway: 0.02,
  pool: -0.25,
  bed: 0.15,
  hedge: 1.2,
  fence: 1.0,
};

/** Ground level in floor coordinates: below the ground floor slab (0.2 m), the floor itself further up. */
export function groundLevel(floor: Floor): number {
  return floor.elevation > 0.3 ? 0 : -0.2;
}

/** Height outdoor lamps stand on at a point: ground level, or the top of a terrace or bed there. */
export function outdoorGround(floor: Floor, x: number, z: number): number {
  const a = (floor.outdoor ?? []).find((o) => o.type !== "hedge" && o.type !== "fence" && o.type !== "pool" && pointInPolygon([x, z], o.points));
  return groundLevel(floor) + (a ? OUTDOOR_TOP[a.type] : 0);
}

/** Area outside the house (lawn, terrace, pool, hedge …), drawn like a room. */
export interface OutdoorArea {
  id: string;
  type: OutdoorType;
  points: Vec2[];
}

/** Energy flow: meter position and power sensors (W). Grid positive = import, battery positive = discharging. */
export interface EnergySettings {
  meter: { floor_id: string; x: number; z: number } | null;
  grid: string | null;
  grid_invert: boolean;
  solar: string | null;
  battery: string | null;
  battery_invert: boolean;
  battery_soc: string | null;
  tariff: string | null;
}

/** A person and the sensor whose state names the room they are in (ESPresense, Bermuda, …). */
export interface PresenceLink {
  person: string;
  sensor: string | null;
}

export interface Building {
  version: 1;
  floors: Floor[];
  settings: BuildingSettings;
  energy: EnergySettings;
  presence: PresenceLink[];
}

export const DEFAULT_ENERGY: EnergySettings = {
  meter: null,
  grid: null,
  grid_invert: false,
  solar: null,
  battery: null,
  battery_invert: false,
  battery_soc: null,
  tariff: null,
};

export const FLOOR_MATERIALS = ["wood", "oak", "tiles", "carpet", "stone", "concrete"] as const;

export const DEFAULT_ROOF: RoofSettings = { type: "none", pitch: 35, overhang: 0.4 };

export const DEFAULT_SETTINGS: BuildingSettings = { wall_exterior: 0.24, wall_interior: 0.12, grid: 0.05, north: 0, roof: { ...DEFAULT_ROOF } };

export function emptyBuilding(): Building {
  return { version: 1, floors: [], settings: { ...DEFAULT_SETTINGS }, energy: { ...DEFAULT_ENERGY }, presence: [] };
}

export function newFloor(id: string, name: string, elevation: number): Floor {
  return {
    id,
    name,
    elevation,
    height: 2.5,
    cut_height: 1.15,
    rooms: [],
    openings: [],
    furniture: [],
    placements: [],
    background: null,
    outdoor: [],
    walls: [],
    ha_floor: null,
  };
}

/** Storey height used to place floors created from Home Assistant levels. */
export const LEVEL_HEIGHT = 2.75;

/** Where a new floor goes: at its Home Assistant level if known, otherwise on top. */
export function floorElevation(floors: Floor[], level: number | null | undefined): number {
  if (level != null && Number.isFinite(level)) return Math.round(level * LEVEL_HEIGHT * 100) / 100;
  const top = floors.reduce<Floor | null>((t, f) => (!t || f.elevation > t.elevation ? f : t), null);
  return top ? Math.round((top.elevation + top.height + 0.25) * 100) / 100 : 0;
}

/**
 * Rooms for areas as 4 × 3 m tiles in rows beside a floor's existing rooms, to be dragged into place
 * and resized.
 */
export function roomTiles(floor: Floor, areas: { area_id: string; name: string }[], id: () => string): Room[] {
  const xs = floor.rooms.flatMap((r) => r.points.map((p) => p[0]));
  const zs = floor.rooms.flatMap((r) => r.points.map((p) => p[1]));
  const x0 = xs.length ? Math.ceil(Math.max(...xs)) + 1 : 0;
  const z0 = zs.length ? Math.floor(Math.min(...zs)) : 0;
  return areas.map((a, i) => {
    const x = x0 + (i % 3) * 4.5;
    const z = z0 + Math.floor(i / 3) * 3.5;
    return { id: id(), name: a.name, area_id: a.area_id, points: [[x, z], [x + 4, z], [x + 4, z + 3], [x, z + 3]] as Vec2[], floor_material: "wood" };
  });
}

/**
 * Resizes a furniture item by dragging one corner (`corner`: signs of the corner in the item's own
 * frame) to a plan point; the opposite corner stays in place. Sizes snap to `grid`.
 */
export function resizeFurniture(f: Furniture, corner: [1 | -1, 1 | -1], p: Vec2, grid: number): Pick<Furniture, "x" | "z" | "w" | "d"> {
  const a = (f.rotation * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const [sx, sz] = corner;
  // item axes in the plan: local x → (c, s), local z → (-s, c)
  const ax = f.x - sx * (f.w / 2) * c + sz * (f.d / 2) * s;
  const az = f.z - sx * (f.w / 2) * s - sz * (f.d / 2) * c;
  const dx = p[0] - ax;
  const dz = p[1] - az;
  const snapSize = (v: number) => Math.max(0.1, Math.round(v / grid) * grid);
  const w = snapSize((dx * c + dz * s) * sx);
  const d = snapSize((-dx * s + dz * c) * sz);
  const r = (v: number) => Math.round(v * 1000) / 1000;
  return { x: r(ax + sx * (w / 2) * c - sz * (d / 2) * s), z: r(az + sx * (w / 2) * s + sz * (d / 2) * c), w: r(w), d: r(d) };
}

export const FURNITURE_TYPES = [
  "lamp_ceiling",
  "lamp_downlight",
  "lamp_spot",
  "lamp_panel",
  "lamp_pendant",
  "lamp_floor",
  "lamp_table",
  "lamp_wall",
  "led_strip",
  "lamp_uplight",
  "lamp_bollard",
  "lamp_garden",
  "radiator",
  "sofa",
  "armchair",
  "stool",
  "coffee_table",
  "tv_board",
  "tv_wall",
  "sideboard",
  "shelf",
  "plant",
  "rug",
  "table",
  "table_round",
  "chair",
  "bench",
  "corner_bench",
  "bar_stool",
  "kitchen",
  "kitchen_wall",
  "kitchen_tall",
  "island",
  "sink",
  "stove",
  "dishwasher",
  "fridge",
  "bed",
  "bunk_bed",
  "nightstand",
  "wardrobe",
  "dresser",
  "bathtub",
  "shower",
  "wc",
  "washbasin",
  "washer",
  "dryer",
  "desk",
  "office_chair",
  "tall_cabinet",
  "coat_rack",
  "stairs",
  "robot_vacuum",
  "parking",
  "fridge_smart",
  "stairwell",
] as const;

/** Furniture library sections (the editor lists them in this order). */
export const FURNITURE_GROUPS: Record<string, FurnitureType[]> = {
  lights: ["lamp_ceiling", "lamp_downlight", "lamp_spot", "lamp_panel", "lamp_pendant", "lamp_floor", "lamp_uplight", "lamp_table", "lamp_wall", "led_strip", "lamp_bollard", "lamp_garden"],
  living: ["sofa", "armchair", "stool", "coffee_table", "tv_board", "tv_wall", "sideboard", "shelf", "plant", "rug"],
  dining: ["table", "table_round", "chair", "bench", "corner_bench", "bar_stool"],
  kitchen: ["kitchen", "kitchen_wall", "kitchen_tall", "island", "sink", "stove", "dishwasher", "fridge"],
  sleeping: ["bed", "bunk_bed", "nightstand", "wardrobe", "dresser"],
  bath: ["bathtub", "shower", "wc", "washbasin", "washer", "dryer"],
  work: ["desk", "office_chair", "tall_cabinet", "coat_rack", "radiator", "stairs", "robot_vacuum"],
  vehicles: ["parking"],
};

/** Furniture that can show a linked entity (TV state, power, …). */
/** Lamps: drawn live (they glow with their light) and tapped directly in 3D. */
export const LAMP_TYPES = new Set<string>([
  "lamp_ceiling",
  "lamp_downlight",
  "lamp_spot",
  "lamp_panel",
  "lamp_pendant",
  "lamp_floor",
  "lamp_uplight",
  "lamp_table",
  "lamp_wall",
  "led_strip",
  "lamp_bollard",
  "lamp_garden",
]);

/** Items that can be lifted off the floor (a wall cabinet, a shelf): everything but lamps hung from the ceiling and the ceiling-mounted pack items. */
export function canLift(f: Pick<Furniture, "type">): boolean {
  if (["lamp_ceiling", "lamp_downlight", "lamp_spot", "lamp_panel", "lamp_pendant", "led_strip", "stairs", "stairwell", "parking"].includes(f.type)) return false;
  return packItem(f.type)?.mount !== "ceiling";
}

export function isLamp(type: string): boolean {
  return LAMP_TYPES.has(type) || !!packItem(type)?.light;
}

/** Furniture a table lamp can stand on. */
const SURFACES = new Set<string>([
  "table",
  "table_round",
  "coffee_table",
  "desk",
  "nightstand",
  "sideboard",
  "dresser",
  "kitchen",
  "island",
  "tv_board",
  "dishwasher",
  "washer",
  "dryer",
]);

/**
 * Positions of a rows × cols grid of lamps in a room: cells of equal size over the room's bounding box,
 * one lamp per cell centre that lies inside the room (L-shaped rooms simply leave cells out).
 */
export function spotGrid(room: Room, rows: number, cols: number, inset = 0): Vec2[] {
  const b = bounds(room.points);
  const w = b.x1 - b.x0 - 2 * inset;
  const d = b.z1 - b.z0 - 2 * inset;
  const out: Vec2[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p: Vec2 = [Math.round((b.x0 + inset + (w / cols) * (c + 0.5)) * 1000) / 1000, Math.round((b.z0 + inset + (d / rows) * (r + 0.5)) * 1000) / 1000];
      if (pointInPolygon(p, room.points)) out.push(p);
    }
  }
  return out;
}

export type Direction = "right" | "down" | "left" | "up";

/** Point `length` metres from `p` in a plan direction (right = +x, down = +z, as in the editor). */
export function step(p: Vec2, length: number, dir: Direction): Vec2 {
  const r = (v: number) => Math.round(v * 1000) / 1000;
  const [dx, dz] = { right: [1, 0], down: [0, 1], left: [-1, 0], up: [0, -1] }[dir];
  return [r(p[0] + dx * length), r(p[1] + dz * length)];
}

/** Height of the highest furniture top under a point (0 = the floor). */
export function surfaceHeight(floor: Floor, x: number, z: number): number {
  let top = 0;
  for (const f of floor.furniture) {
    if (!(SURFACES.has(f.type) || packItem(f.type)?.surface) || !pointInPolygon([x, z], furnitureFootprint(f))) continue;
    top = Math.max(top, f.h);
  }
  return top;
}

export const ELECTRIC_FURNITURE = new Set<string>([
  ...LAMP_TYPES,
  "radiator",
  "robot_vacuum",
  "tv_board",
  "tv_wall",
  "desk",
  "fridge",
  "fridge_smart",
  "stove",
  "kitchen_tall",
  "dishwasher",
  "washer",
  "dryer",
  "kitchen",
  "island",
  "sink",
]);

export type FurnitureType = (typeof FURNITURE_TYPES)[number];

/** Default size (width x, depth z, height) of new furniture in metres. */
export const FURNITURE_SIZE: Record<FurnitureType, [number, number, number]> = {
  sofa: [2.2, 0.9, 0.82],
  armchair: [0.85, 0.85, 0.8],
  table: [1.6, 0.9, 0.75],
  chair: [0.46, 0.5, 0.9],
  bed: [1.6, 2.05, 0.9],
  nightstand: [0.45, 0.4, 0.5],
  wardrobe: [1.8, 0.6, 2.1],
  shelf: [0.9, 0.35, 1.9],
  kitchen: [2.4, 0.62, 0.92],
  fridge: [0.6, 0.65, 1.8],
  fridge_smart: [0.91, 0.73, 1.78],
  stairwell: [1.0, 2.6, 0.02],
  stove: [0.6, 0.62, 0.92],
  sink: [0.9, 0.62, 0.92],
  bathtub: [1.7, 0.75, 0.58],
  shower: [0.9, 0.9, 2.0],
  wc: [0.38, 0.6, 0.8],
  washbasin: [0.6, 0.46, 0.85],
  desk: [1.4, 0.7, 0.75],
  tv_board: [1.8, 0.42, 0.5],
  plant: [0.45, 0.45, 1.1],
  rug: [2.0, 1.4, 0.01],
  stairs: [1.0, 3.2, 2.75],
  stool: [0.55, 0.55, 0.42],
  lamp_ceiling: [0.4, 0.4, 0.08],
  lamp_downlight: [0.1, 0.1, 0.02],
  lamp_spot: [0.1, 0.1, 0.14],
  lamp_panel: [0.6, 0.6, 0.03],
  lamp_uplight: [0.35, 0.35, 1.8],
  lamp_bollard: [0.16, 0.16, 0.8],
  lamp_garden: [0.12, 0.12, 0.3],
  radiator: [1.0, 0.1, 0.6],
  robot_vacuum: [0.36, 0.5, 0.1],
  parking: [2.6, 5.2, 0.02],
  lamp_pendant: [0.4, 0.4, 0.8],
  lamp_floor: [0.4, 0.4, 1.7],
  lamp_table: [0.28, 0.28, 0.45],
  lamp_wall: [0.22, 0.12, 0.2],
  led_strip: [2.0, 0.04, 0.03],
  coffee_table: [1.1, 0.6, 0.42],
  tv_wall: [1.3, 0.08, 0.75],
  sideboard: [1.6, 0.45, 0.8],
  table_round: [1.1, 1.1, 0.75],
  bench: [1.4, 0.45, 0.85],
  corner_bench: [2.0, 1.6, 0.9],
  bar_stool: [0.42, 0.42, 0.75],
  kitchen_wall: [0.8, 0.35, 0.7],
  kitchen_tall: [0.6, 0.62, 2.1],
  island: [1.8, 0.9, 0.92],
  dishwasher: [0.6, 0.62, 0.92],
  bunk_bed: [1.0, 2.05, 1.65],
  dresser: [1.0, 0.5, 0.9],
  washer: [0.6, 0.6, 0.85],
  dryer: [0.6, 0.6, 0.85],
  office_chair: [0.65, 0.65, 1.1],
  tall_cabinet: [0.6, 0.6, 2.1],
  coat_rack: [1.0, 0.35, 1.9],
};

export const OPENING_DEFAULTS = {
  door: { width: 0.9, sill: 0, height: 2.05 },
  window: { width: 1.2, sill: 0.9, height: 1.3 },
  garage: { width: 2.5, sill: 0, height: 2.1 },
} as const;

/** Kinds of openings offered when placing one; a terrace door is a window down to the floor. */
/** Door looks: room doors, front doors (with glass, one or two sidelights), a glass door, a sliding door. */
export const DOOR_STYLES = ["interior", "front", "front_glass", "sidelight", "sidelights", "glass", "sliding", "passage"] as const;
export const WINDOW_STYLES = ["standard", "bars"] as const;
export type OpeningStyle = (typeof DOOR_STYLES)[number] | (typeof WINDOW_STYLES)[number];

/** The style an opening is drawn with: its own, or the automatic one for its wall. */
export function openingStyle(o: Pick<Opening, "type" | "style">, exterior: boolean): OpeningStyle {
  if (o.type === "door") return o.style && (DOOR_STYLES as readonly string[]).includes(o.style) ? o.style : exterior ? "front" : "interior";
  return o.style && (WINDOW_STYLES as readonly string[]).includes(o.style) ? o.style : "standard";
}

/** A front door look (thick leaf, threshold, light above it). */
export function isFrontDoor(style: OpeningStyle): boolean {
  return style === "front" || style === "front_glass" || style === "sidelight" || style === "sidelights";
}

export const OPENING_PRESETS = {
  door: { type: "door", leaves: 1, width: 0.9, sill: 0, height: 2.05, style: "interior" },
  front: { type: "door", leaves: 1, width: 1.0, sill: 0, height: 2.1, style: "front" },
  door_double: { type: "door", leaves: 2, width: 1.6, sill: 0, height: 2.05 },
  window: { type: "window", leaves: 1, width: 1.2, sill: 0.9, height: 1.3 },
  window_double: { type: "window", leaves: 2, width: 1.6, sill: 0.9, height: 1.3 },
  terrace: { type: "window", leaves: 1, width: 1.0, sill: 0, height: 2.1 },
  terrace_double: { type: "window", leaves: 2, width: 1.8, sill: 0, height: 2.1 },
  garage: { type: "garage", leaves: 1, width: 2.5, sill: 0, height: 2.1 },
} as const satisfies Record<string, { type: OpeningType; leaves: 1 | 2; width: number; sill: number; height: number; style?: OpeningStyle }>;

export type OpeningPreset = keyof typeof OPENING_PRESETS;

/** The preset an opening matches (by type, leaves, style and whether it reaches the floor). */
export function openingPreset(o: Pick<Opening, "type" | "leaves" | "sill" | "style">): OpeningPreset {
  if (o.type === "garage") return "garage";
  const two = o.leaves === 2;
  if (o.type === "door") {
    if (!two && o.style && isFrontDoor(o.style)) return "front";
    return two ? "door_double" : "door";
  }
  if (o.sill < 0.1) return two ? "terrace_double" : "terrace";
  return two ? "window_double" : "window";
}

/** Fill fields added in later versions so older saved buildings keep working. */
export function normalizeBuilding(b: Building): Building {
  b.energy = { ...DEFAULT_ENERGY, ...(b.energy ?? {}) };
  b.presence = b.presence ?? [];
  b.settings = { ...DEFAULT_SETTINGS, ...b.settings, roof: { ...DEFAULT_ROOF, ...(b.settings?.roof ?? {}) } };
  for (const f of b.floors) {
    f.outdoor = f.outdoor ?? [];
    f.walls = f.walls ?? [];
    f.rooms = f.rooms.map((r) => ({ ...r, panel: r.panel ?? [] }));
    f.ha_floor = f.ha_floor ?? null;
    f.placements = f.placements.map((p) => ({ ...p, mount: p.mount ?? null, rotation: p.rotation ?? 0 }));
    f.furniture = f.furniture.map((m) => ({ ...m, entity: m.entity ?? null, power: m.power ?? null }));
    // lights placed as devices (before lamps existed) become lamps of their mount type
    const lights = f.placements.filter((p) => p.entity_id.startsWith("light."));
    if (lights.length) {
      const type: Record<LampMount, FurnitureType> = { ceiling: "lamp_ceiling", floor: "lamp_floor", table: "lamp_table", wall: "lamp_wall" };
      for (const p of lights) {
        const t = type[p.mount ?? "ceiling"];
        const [w, d, h] = FURNITURE_SIZE[t];
        f.furniture.push({ id: `lamp_${p.entity_id.slice(6).replace(/[^A-Za-z0-9_\-.]/g, "_")}`.slice(0, 64), type: t, x: p.x, z: p.z, rotation: 0, w, d, h, variant: null, entity: p.entity_id, power: null });
      }
      f.placements = f.placements.filter((p) => !p.entity_id.startsWith("light."));
    }
    f.openings = f.openings.map((o) => ({
      ...o,
      hinge: o.hinge ?? "left",
      leaves: o.leaves ?? 1,
      swing: o.swing ?? "in",
      style: o.style ?? null,
      cover: o.cover ?? null,
      contact: o.contact ?? null,
      contact2: o.contact2 ?? null,
      tilt: o.tilt ?? null,
    }));
  }
  return b;
}

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Signed area (positive = counter-clockwise in x/z maths orientation). */
export function signedArea(points: readonly Vec2[]): number {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, z0] = points[i];
    const [x1, z1] = points[(i + 1) % points.length];
    a += x0 * z1 - x1 * z0;
  }
  return a / 2;
}

export function polygonArea(points: readonly Vec2[]): number {
  return Math.abs(signedArea(points));
}

/** Area-weighted centroid; falls back to the vertex average for degenerate polygons. */
export function centroid(points: readonly Vec2[]): Vec2 {
  const a = signedArea(points);
  if (Math.abs(a) < 1e-9) {
    const n = points.length || 1;
    return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n];
  }
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, z0] = points[i];
    const [x1, z1] = points[(i + 1) % points.length];
    const f = x0 * z1 - x1 * z0;
    cx += (x0 + x1) * f;
    cz += (z0 + z1) * f;
  }
  return [cx / (6 * a), cz / (6 * a)];
}

/** True when the polygon is an axis-aligned rectangle (so the editor can offer x/z/width/depth fields). */
export function isAxisRect(points: readonly Vec2[]): boolean {
  if (points.length !== 4) return false;
  for (let i = 0; i < 4; i++) {
    const [x0, z0] = points[i];
    const [x1, z1] = points[(i + 1) % 4];
    if (Math.abs(x0 - x1) > 1e-6 && Math.abs(z0 - z1) > 1e-6) return false;
  }
  return true;
}

export function bounds(points: readonly Vec2[]): { x0: number; z0: number; x1: number; z1: number } {
  let x0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let z1 = -Infinity;
  for (const [x, z] of points) {
    x0 = Math.min(x0, x);
    z0 = Math.min(z0, z);
    x1 = Math.max(x1, x);
    z1 = Math.max(z1, z);
  }
  return { x0, z0, x1, z1 };
}

/** Corners of a furniture item in world x/z (rotated rectangle). */
export function furnitureFootprint(f: Furniture): Vec2[] {
  const a = (f.rotation * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const hw = f.w / 2;
  const hd = f.d / 2;
  return [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ].map(([x, z]) => [f.x + x * c - z * s, f.z + x * s + z * c] as Vec2);
}

export function pointInPolygon(p: Vec2, points: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i];
    const [xj, zj] = points[j];
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** 3D model of each lamp type. */
export const LAMP_MODEL: Record<string, LampModel> = {
  lamp_ceiling: "ceiling",
  lamp_downlight: "downlight",
  lamp_spot: "spot",
  lamp_panel: "panel",
  lamp_uplight: "uplight",
  lamp_bollard: "bollard",
  lamp_garden: "garden",
  lamp_pendant: "pendant",
  lamp_floor: "floor",
  lamp_table: "table",
  lamp_wall: "wall",
  led_strip: "strip",
};
