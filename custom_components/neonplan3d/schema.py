"""Validation schemas for the building data (mirrors frontend/src/model.ts).

Known fields are checked; fields added by newer frontends are passed through (extra=ALLOW_EXTRA),
so saving keeps working after a frontend update until Home Assistant restarts with the new backend.
"""

from __future__ import annotations

import voluptuous as vol

MAX_FLOORS = 20
MAX_ROOMS = 200
MAX_POINTS = 200
MAX_ITEMS = 1000
MAX_IMAGE_CHARS = 8 * 1024 * 1024

_ID = vol.All(str, vol.Length(min=1, max=64), vol.Match(r"^[A-Za-z0-9_\-.]+$"))
_NAME = vol.All(str, vol.Length(max=100))
_COORD = vol.All(vol.Coerce(float), vol.Range(min=-1000, max=1000))
_LENGTH = vol.All(vol.Coerce(float), vol.Range(min=0, max=100))
_POINT = vol.All([_COORD], vol.Length(min=2, max=2))
_ENTITY_REF = vol.Any(None, vol.All(str, vol.Length(max=255)))

ROOM_SCHEMA = vol.Schema(
    {
        vol.Required("id"): _ID,
        vol.Required("name"): _NAME,
        vol.Required("area_id"): vol.Any(None, vol.All(str, vol.Length(max=255))),
        vol.Required("points"): vol.All([_POINT], vol.Length(min=3, max=MAX_POINTS)),
        vol.Required("floor_material"): vol.All(str, vol.Length(max=32)),
        # entities shown in the room's panel although they are not in the plan
        vol.Optional("panel", default=list): vol.All([vol.All(str, vol.Length(max=255))], vol.Length(max=100)),
    },
    extra=vol.ALLOW_EXTRA,
)

# door looks (room door, front doors with glass and sidelights, glass and sliding door) and window looks
_OPENING_STYLES = ["interior", "front", "front_glass", "sidelight", "sidelights", "glass", "sliding", "passage"]
_OPENING_STYLES += ["standard", "bars"]

OPENING_SCHEMA = vol.Schema(
    {
        vol.Required("id"): _ID,
        vol.Required("room_id"): _ID,
        vol.Required("edge"): vol.All(int, vol.Range(min=0, max=MAX_POINTS)),
        vol.Required("offset"): _LENGTH,
        vol.Required("width"): _LENGTH,
        vol.Required("type"): vol.In(["door", "window", "garage"]),
        vol.Required("sill"): _LENGTH,
        vol.Required("height"): _LENGTH,
        # window sash hinge as seen from the room; entities: None = assign automatically by area,
        # "none" = no entity
        vol.Optional("hinge", default="left"): vol.In(["left", "right"]),
        # double doors and windows: two leaves, the second with a contact of its own
        vol.Optional("leaves", default=1): vol.In([1, 2]),
        # doors: swing into the room ("in") or to the other side ("out")
        vol.Optional("swing", default="in"): vol.In(["in", "out"]),
        # look: None = automatic (front door in an exterior wall, room door inside; plain window)
        vol.Optional("style", default=None): vol.Any(None, vol.In(_OPENING_STYLES)),
        vol.Optional("contact2", default=None): vol.Any(None, vol.All(str, vol.Length(max=255))),
        # windows: a plain contact, a handle sensor (open / tilted / closed), or a contact and a tilt sensor
        vol.Optional("sensor", default=None): vol.Any(None, vol.In(["contact", "handle", "contact_tilt"])),
        # the same for the second leaf of a double window
        vol.Optional("sensor2", default=None): vol.Any(None, vol.In(["contact", "handle", "contact_tilt"])),
        vol.Optional("tilt2", default=None): vol.Any(None, vol.All(str, vol.Length(max=255))),
        # a sensor with the blind's position while it moves (covers that only report at the end)
        vol.Optional("position", default=None): vol.Any(None, vol.All(str, vol.Length(max=255))),
        # the position sensor counts the other way round (0 = open)
        vol.Optional("position_inverted", default=False): bool,
        vol.Optional("cover", default=None): _ENTITY_REF,
        vol.Optional("contact", default=None): _ENTITY_REF,
        vol.Optional("tilt", default=None): _ENTITY_REF,
    },
    extra=vol.ALLOW_EXTRA,
)

# screens: a picture shown while an entity is in a state (an image id of the image store, or an http URL)
_SCREEN_PICTURE_SCHEMA = vol.Schema(
    {
        vol.Required("entity"): vol.All(str, vol.Length(max=255)),
        # compare this attribute (e.g. app_name) instead of the state
        vol.Optional("attribute", default=None): vol.Any(None, vol.All(str, vol.Length(max=64))),
        vol.Required("state"): vol.All(str, vol.Length(max=128)),
        vol.Required("image"): vol.All(str, vol.Length(max=2048)),
    }
)

# parking spots: which vehicle a state of the type sensor means
_VEHICLE_TYPE_SCHEMA = vol.Schema(
    {vol.Required("state"): vol.All(str, vol.Length(max=64)), vol.Required("vehicle"): vol.All(str, vol.Length(max=96))}
)

FURNITURE_SCHEMA = vol.Schema(
    {
        vol.Required("id"): _ID,
        # built-in type, or "pack:<pack id>:<item id>" for furniture from a pack
        vol.Required("type"): vol.All(str, vol.Length(max=96)),
        vol.Required("x"): _COORD,
        vol.Required("z"): _COORD,
        vol.Required("rotation"): vol.Coerce(float),
        vol.Required("w"): _LENGTH,
        vol.Required("d"): _LENGTH,
        vol.Required("h"): _LENGTH,
        vol.Required("variant"): vol.Any(None, vol.All(str, vol.Length(max=32))),
        # linked entities (e.g. the TV's media player, a power sensor): None = automatic, "none" = no entity
        vol.Optional("entity", default=None): vol.Any(None, vol.All(str, vol.Length(max=255))),
        vol.Optional("power", default=None): vol.Any(None, vol.All(str, vol.Length(max=255))),
        # smart fridge: door sensors of the left and the right door
        vol.Optional("door_left", default=None): vol.Any(None, vol.All(str, vol.Length(max=255))),
        vol.Optional("door_right", default=None): vol.Any(None, vol.All(str, vol.Length(max=255))),
        # ask before switching the linked entity
        vol.Optional("confirm", default=False): bool,
        # parking spots: the vehicle shown (a pack item type) while the entity reports a car, its size
        # factor, and a sensor naming the kind of vehicle with a state -> vehicle mapping
        # height of the bottom edge above the floor (None = default: the floor, a pack item's mount)
        vol.Optional("mount_y", default=None): vol.Any(None, vol.All(vol.Coerce(float), vol.Range(min=0, max=10))),
        vol.Optional("pictures", default=[]): vol.All([_SCREEN_PICTURE_SCHEMA], vol.Length(max=20)),
        # screens: the screen around a rule picture is dark (default) or white
        vol.Optional("screen_bg", default="black"): vol.In(["black", "white"]),
        vol.Optional("vehicle", default=None): vol.Any(None, vol.All(str, vol.Length(max=96))),
        vol.Optional("scale", default=1.0): vol.All(vol.Coerce(float), vol.Range(min=0.2, max=2)),
        vol.Optional("type_entity", default=None): vol.Any(None, vol.All(str, vol.Length(max=255))),
        vol.Optional("types", default=[]): vol.All([_VEHICLE_TYPE_SCHEMA], vol.Length(max=20)),
    },
    extra=vol.ALLOW_EXTRA,
)

PLACEMENT_SCHEMA = vol.Schema(
    {
        vol.Required("entity_id"): vol.All(str, vol.Length(max=255)),
        vol.Required("x"): _COORD,
        vol.Required("z"): _COORD,
        vol.Required("y"): vol.Any(None, _LENGTH),
        # lights: how the lamp is mounted (None = ceiling)
        vol.Optional("mount", default=None): vol.Any(None, vol.In(["ceiling", "floor", "table", "wall"])),
        # turn around the vertical axis (degrees)
        vol.Optional("rotation", default=0.0): vol.Coerce(float),
        # cameras: opening angle (degrees) and reach (m) of the field of view; None = default
        vol.Optional("fov", default=None): vol.Any(None, vol.All(vol.Coerce(float), vol.Range(min=10, max=360))),
        vol.Optional("reach", default=None): vol.Any(None, vol.All(vol.Coerce(float), vol.Range(min=0.5, max=50))),
        vol.Optional("tilt", default=None): vol.Any(None, vol.All(vol.Coerce(float), vol.Range(min=0, max=90))),
        # ask before switching this device from the 3D view, the quick menu or the room panel
        vol.Optional("confirm", default=False): bool,
    },
    extra=vol.ALLOW_EXTRA,
)

BACKGROUND_SCHEMA = vol.Schema(
    {
        vol.Required("image_id"): _ID,
        vol.Required("x"): _COORD,
        vol.Required("z"): _COORD,
        vol.Required("width"): vol.All(vol.Coerce(float), vol.Range(min=0.1, max=1000)),
        vol.Required("opacity"): vol.All(vol.Coerce(float), vol.Range(min=0, max=1)),
    },
    extra=vol.ALLOW_EXTRA,
)

OUTDOOR_TYPES = ["lawn", "terrace", "path", "driveway", "pool", "bed", "hedge", "fence"]

OUTDOOR_SCHEMA = vol.Schema(
    {
        vol.Required("id"): _ID,
        vol.Required("type"): vol.In(OUTDOOR_TYPES),
        vol.Required("points"): vol.All([_POINT], vol.Length(min=3, max=MAX_POINTS)),
    },
    extra=vol.ALLOW_EXTRA,
)

ROOF_SCHEMA = vol.Schema(
    {
        vol.Optional("type", default="none"): vol.In(["none", "flat", "gable"]),
        vol.Optional("pitch", default=35): vol.All(vol.Coerce(float), vol.Range(min=5, max=60)),
        vol.Optional("overhang", default=0.4): vol.All(vol.Coerce(float), vol.Range(min=0, max=2)),
        # ridge of a gable roof along the longer or the shorter side of the outline
        vol.Optional("ridge"): vol.In(["long", "short"]),
    },
    extra=vol.ALLOW_EXTRA,
)

FREE_WALL_SCHEMA = vol.Schema(
    {
        vol.Required("id"): _ID,
        vol.Required("a"): _POINT,
        vol.Required("b"): _POINT,
        vol.Optional("thickness", default=None): vol.Any(None, vol.All(vol.Coerce(float), vol.Range(min=0.02, max=1))),
    },
    extra=vol.ALLOW_EXTRA,
)

FLOOR_SCHEMA = vol.Schema(
    {
        vol.Required("id"): _ID,
        vol.Required("name"): _NAME,
        vol.Required("elevation"): vol.All(vol.Coerce(float), vol.Range(min=-100, max=500)),
        vol.Required("height"): vol.All(vol.Coerce(float), vol.Range(min=1, max=20)),
        vol.Required("cut_height"): vol.All(vol.Coerce(float), vol.Range(min=0.2, max=20)),
        vol.Required("rooms"): vol.All([ROOM_SCHEMA], vol.Length(max=MAX_ROOMS)),
        vol.Required("openings"): vol.All([OPENING_SCHEMA], vol.Length(max=MAX_ITEMS)),
        vol.Required("furniture"): vol.All([FURNITURE_SCHEMA], vol.Length(max=MAX_ITEMS)),
        vol.Required("placements"): vol.All([PLACEMENT_SCHEMA], vol.Length(max=MAX_ITEMS)),
        vol.Required("background"): vol.Any(None, BACKGROUND_SCHEMA),
        vol.Optional("outdoor", default=list): vol.All([OUTDOOR_SCHEMA], vol.Length(max=MAX_ITEMS)),
        # free-standing walls (partitions); room walls come from the room edges
        vol.Optional("walls", default=list): vol.All([FREE_WALL_SCHEMA], vol.Length(max=MAX_ITEMS)),
        # floor of Home Assistant's floor registry this floor stands for
        vol.Optional("ha_floor", default=None): vol.Any(None, vol.All(str, vol.Length(max=255))),
    },
    extra=vol.ALLOW_EXTRA,
)

SETTINGS_SCHEMA = vol.Schema(
    {
        vol.Required("wall_exterior"): vol.All(vol.Coerce(float), vol.Range(min=0.02, max=1)),
        vol.Required("wall_interior"): vol.All(vol.Coerce(float), vol.Range(min=0.02, max=1)),
        vol.Required("grid"): vol.All(vol.Coerce(float), vol.Range(min=0.01, max=1)),
        # direction of north in the plan, degrees clockwise from "up"
        vol.Optional("north", default=0): vol.All(vol.Coerce(float), vol.Range(min=-360, max=360)),
        vol.Optional("roof", default=lambda: {"type": "none", "pitch": 35, "overhang": 0.4}): ROOF_SCHEMA,
        # the weather entity for the weather outside (None = the first one)
        vol.Optional("weather_entity", default=None): vol.Any(None, vol.All(str, vol.Length(max=255))),
        # which weather effects the 3D view shows (None = all but fog)
        vol.Optional("weather_effects", default=None): vol.Any(
            None, [vol.In(["rain", "snow", "fog", "clouds", "lightning", "sky"])]
        ),
    },
    extra=vol.ALLOW_EXTRA,
)

_ENTITY = vol.Any(None, vol.All(str, vol.Length(max=255)))

METER_SCHEMA = vol.Schema(
    {vol.Required("floor_id"): _ID, vol.Required("x"): _COORD, vol.Required("z"): _COORD}, extra=vol.ALLOW_EXTRA
)

ENERGY_DEFAULTS = {
    "meter": None,
    "grid": None,
    "grid_invert": False,
    "solar": None,
    "battery": None,
    "battery_invert": False,
    "battery_soc": None,
    "tariff": None,
}

# Power sensors in watts: grid positive = import, battery positive = discharging (both can be inverted)
ENERGY_SCHEMA = vol.Schema(
    {
        vol.Optional("meter", default=None): vol.Any(None, METER_SCHEMA),
        vol.Optional("grid", default=None): _ENTITY,
        vol.Optional("grid_invert", default=False): bool,
        vol.Optional("solar", default=None): _ENTITY,
        vol.Optional("battery", default=None): _ENTITY,
        vol.Optional("battery_invert", default=False): bool,
        vol.Optional("battery_soc", default=None): _ENTITY,
        vol.Optional("tariff", default=None): _ENTITY,
    },
    extra=vol.ALLOW_EXTRA,
)

# Which sensor tells the room of a person (ESPresense, Bermuda: the state is a room or area name)
PRESENCE_SCHEMA = vol.Schema(
    {vol.Required("person"): vol.All(str, vol.Length(max=255)), vol.Required("sensor"): _ENTITY},
    extra=vol.ALLOW_EXTRA,
)

BUILDING_SCHEMA = vol.Schema(
    {
        vol.Required("version"): 1,
        vol.Required("floors"): vol.All([FLOOR_SCHEMA], vol.Length(max=MAX_FLOORS)),
        vol.Required("settings"): SETTINGS_SCHEMA,
        vol.Optional("energy", default=lambda: dict(ENERGY_DEFAULTS)): ENERGY_SCHEMA,
        vol.Optional("presence", default=list): vol.All([PRESENCE_SCHEMA], vol.Length(max=50)),
    },
    extra=vol.ALLOW_EXTRA,
)

IMAGE_DATA = vol.All(
    str,
    vol.Length(max=MAX_IMAGE_CHARS),
    vol.Match(r"^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$"),
)


def empty_building() -> dict:
    """Return a building without floors."""
    return {
        "version": 1,
        "floors": [],
        "settings": {"wall_exterior": 0.24, "wall_interior": 0.12, "grid": 0.05},
        "energy": dict(ENERGY_DEFAULTS),
        "presence": [],
    }


def image_ids(building: dict) -> set[str]:
    """Return the ids of all images a building refers to: floor backgrounds and screen pictures."""
    ids = {floor["background"]["image_id"] for floor in building.get("floors", []) if floor.get("background")}
    for floor in building.get("floors", []):
        for item in floor.get("furniture", []):
            for rule in item.get("pictures") or []:
                # a URL or a camera ("camera:<entity>") is no stored image
                if not rule["image"].startswith(("http://", "https://", "camera:")):
                    ids.add(rule["image"])
    return ids
