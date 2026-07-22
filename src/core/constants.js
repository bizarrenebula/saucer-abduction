/* =========================================================================
   CONSTANTS — world sizing + custom-asset manifest.

   ASSETS: set a url to null to keep the built-in procedural version. Files
   live next to index.html (models/ + textures/). Tune scale/rot/lift by eye.
   OBJ_SCALE multiplies everything that stands on the ground.

   FACING CONVENTION: +Z is forward for everything that moves. All movement
   code steers with atan2(dx, dz) and steps along (sin y, cos y), and the
   procedural creatures are all modelled nose-at-+Z. So rotY on a creature must
   leave its nose pointing +Z — a wrong rotY makes the animal travel tail-first
   rather than merely look rotated. Static scenery (tree/barn/crystal) has no
   facing and rotY there is purely cosmetic.
   ========================================================================= */
export const OBJ_SCALE = 1.35;

export const WATER_Y = -3;
export const CHUNK = 80, SEG = 24;

/* Hover altitude, in world units above the terrain directly below the ship.
   HOVER_BASE is the resting height the ship has always flown at; swiping up or
   down on the saucer moves S.hover between HOVER_MIN (skimming the surface —
   the crash floor is ground+2.5, so this keeps a little clearance) and
   HOVER_MAX (3x base). HOVER_SENS is world units of altitude per pixel swiped. */
export const HOVER_BASE = 15, HOVER_MIN = 4, HOVER_MAX = HOVER_BASE * 3;
export const HOVER_SENS = 0.16;
/* Keyboard climb/dive rate in world units per second (W / S on desktop).
   The full HOVER_MIN..HOVER_MAX span takes about 2.5s of held key. */
export const HOVER_KEY_RATE = 16;

/* Ship collision radius. Deliberately under the ~5u visual hull so glancing
   passes read as near-misses rather than unfair phantom hits. */
export const SHIP_R = 4.0;

/* Chase-camera distance/height scale by altitude: descending pulls the camera
   in tight, climbing pulls it back for a wider view. 1.0 at HOVER_BASE. */
export const CAM_ZOOM_LOW = 0.62, CAM_ZOOM_HIGH = 1.5;

/* Altitude trade-off. All three ramps read 1.0 at HOVER_BASE, so resting
   flight behaves exactly as before and only leaving that height changes things.

   Fly low: the beam bites harder and costs less, but trees and barns are lethal.
   Fly high: safe from obstacles, but locks crawl and the reactor bleeds.
   BEAM_STR is a direct multiplier on lock progress; DRAIN_ALT multiplies the
   whole energy drain rate. */
export const BEAM_STR_LOW = 1.35, BEAM_STR_HIGH = 0.35;
export const DRAIN_ALT_LOW = 0.80, DRAIN_ALT_HIGH = 2.20;

/* How many times each ground texture tiles across one CHUNK. Lower = zoomed in
   (bigger features); higher = more repetition. One tile spans CHUNK/tiling
   world units.

   These are tuned per texture because the source images differ hugely in
   resolution, and sharpness is texels-per-world-unit = resolution*tiling/CHUNK.
   grass.jpg is 4500px and can be zoomed hard while staying crisp; sand.jpg is
   only 1000px, so zooming it as far would just magnify blur. The values below
   trade a little extra repetition on sand/rock for detail that actually holds
   up. Retune if you swap in higher-resolution art.

   NOTE: this is what actually controls ground tiling — the `repeat` fields on
   the texture entries below do not apply, since the terrain shader in
   world/chunks.js builds its own UVs. */
export const GROUND_TILING = {
  grass: 6.0,    // 4500px source -> ~337 texels/unit
  sand:  11.0,   // 1000px source -> ~138 texels/unit
  rock:   9.0,   // 1600px source -> ~180 texels/unit
  snow:   6.0,   // procedural 256px, no source detail to preserve
};

export const ASSETS = {
  saucer:  { url:'models/saucer.glb',    scale:5.0, rotY:0,        yOffset:0, seat:false },
  sheep:   { url:'models/sheep.glb',     scale:1.0, rotY:0,        yOffset:0 },
  duck:    { url:'models/duck.glb',      scale:1.0, rotY:0,        yOffset:0 },
  camel:   { url:'models/camel.glb',     scale:1.0, rotY:0,        yOffset:0 },
  goat:    { url:'models/goat.glb',      scale:1.0, rotY:0,        yOffset:0 },
  grass:   { url:'textures/grass.jpg',   repeat:6 },
  mountain:{ url:'textures/mountain.jpg', repeat:5 },
  sand:    { url:'textures/sand.jpg',    repeat:6 },
  crystal: { url:'models/crystal.glb',   scale:1.0, rotY:0,        yOffset:0 },
  barn:    { url:'models/barn.glb',      scale:2.0, rotY:0,        yOffset:0 },
  hiker:   { url:'models/hiker.glb',     scale:1.0, rotY:0,        yOffset:0 },
  tree:    { url:'models/tree.glb',      scale:2.0, rotY:0,        yOffset:0 },
  // Roadside set. Missing files degrade to the procedural shapes in
  // entities/vehicles.js and entities/stations.js, so these can be dropped in
  // later without any code change. Vehicles move, so their rotY must leave the
  // nose at +Z — see the FACING CONVENTION note above.
  gas_station:{ url:'models/gas_station.glb', scale:2.2, rotY:0,   yOffset:0 },
  car1:    { url:'models/car1.glb',      scale:1.0, rotY:0,        yOffset:0 },
  car2:    { url:'models/car2.glb',      scale:1.0, rotY:0,        yOffset:0 },
  bus1:    { url:'models/bus1.glb',      scale:1.0, rotY:0,        yOffset:0 },
};

/* Roadside population, per chunk that contains road. */
export const VEH_PER_CHUNK = 1;      // attempts per road-bearing chunk (~55% take)
export const VEH_STOP_R    = 26;     // ship within this radius -> traffic halts
export const STATION_CHANCE= 0.10;   // chance a road-bearing chunk gets a station
export const PROP_ROAD_GAP = 4.5;    // clear verge kept either side of the tarmac
