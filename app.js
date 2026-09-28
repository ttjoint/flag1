import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { EXRLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/EXRLoader.js";

const $ = (id) => document.getElementById(id);
const assets = {
  environments: [
    ["xiequ_yuan_2k.exr", "XIEQU YUAN / 2K"],
    ["the_sky_is_on_fire_2k.exr", "THE SKY IS ON FIRE / 2K"],
    ["industrial_sunset_02_puresky_2k.exr", "INDUSTRIAL SUNSET / 2K"],
    ["hay_bales_2k.exr", "HAY BALES / 2K"],
    ["golden_gate_hills_2k.exr", "GOLDEN GATE HILLS / 2K"],
    ["farmland_overcast_2k.exr", "FARMLAND OVERCAST / 2K"],
    ["cedar_bridge_sunset_2_2k.exr", "CEDAR BRIDGE SUNSET / 2K"],
    ["camdeboo_road_2k.exr", "CAMDEBOO ROAD / 2K"],
    ["belfast_sunset_puresky_2k.exr", "BELFAST SUNSET / 2K"]
  ],
  defaultFlag: "signal-red"
};

const state = {
  wind: 58,
  gustiness: 82,
  autoWind: true,
  time: 0,
  lastFrame: performance.now(),
  frames: 0,
  fps: 60,
  customFlagUrl: null,
  environmentUrl: null
};

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
// A 1.5x cap keeps the EXR and cloth crisp while avoiding the quadratic
// fragment cost of rendering a large high-DPI viewport at 2x or more.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
$("canvasHost").appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x080b12, 0.025);
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
const cameraTarget = new THREE.Vector3(0, 3.3, 0);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.panSpeed = 0.9;
controls.minDistance = 3.5;
controls.maxDistance = 12;
controls.minPolarAngle = 0.0001;
controls.maxPolarAngle = Math.PI - 0.0001;
controls.target.copy(cameraTarget);
renderer.domElement.addEventListener("contextmenu", (event) => event.preventDefault());

scene.add(new THREE.HemisphereLight(0xb9d3ff, 0x110c14, 1.65));
const keyLight = new THREE.DirectionalLight(0xffd7bb, 3.1);
keyLight.position.set(-3, 5, 4);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x7bb6ff, 1.8);
rimLight.position.set(4, 2, -4);
scene.add(rimLight);

const rig = { poleX: -1.55, poleBottom: -0.35, poleTop: 5.25, flagHeight: 2.1 };
// Shared hoist line for the pulley, halyard, grommets, and pinned cloth.
const hoist = {
  x: rig.poleX,
  z: 0.065,
  pulleyY: rig.poleTop - 0.10,
  topY: rig.poleTop - 0.155,
  get bottomY() { return this.topY - rig.flagHeight; },
  point(t) {
    const sag = 0.028 * Math.sin(t * Math.PI);
    return new THREE.Vector3(this.x, this.topY - t * rig.flagHeight - sag, this.z + 0.014 * Math.sin(t * Math.PI));
  }
};
const poleMaterial = new THREE.MeshPhysicalMaterial({ color: 0x718096, metalness: 1, roughness: 0.14, clearcoat: 0.82, clearcoatRoughness: 0.1 });
const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.058, rig.poleTop - rig.poleBottom, 20), poleMaterial);
pole.position.set(rig.poleX, (rig.poleTop + rig.poleBottom) / 2, 0);
scene.add(pole);
const cap = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0xc8d2e5, metalness: 1, roughness: .12, clearcoat: .8, clearcoatRoughness: .08 }));
cap.position.set(rig.poleX, rig.poleTop, 0);
scene.add(cap);
const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.13, 32), new THREE.MeshPhysicalMaterial({ color: 0x536078, metalness: 1, roughness: .18, clearcoat: .72 }));
base.position.set(rig.poleX, rig.poleBottom, 0);
scene.add(base);

const ropeMaterial = new THREE.MeshStandardMaterial({ color: 0x8a512e, roughness: .96, metalness: 0.01 });
const ropePoints = Array.from({ length: 13 }, (_, index) => {
  return hoist.point(index / 12);
});
const ropeCurve = new THREE.CatmullRomCurve3(ropePoints);
const rope = new THREE.Mesh(new THREE.TubeGeometry(ropeCurve, 32, 0.012, 8, false), ropeMaterial);
scene.add(rope);

const pulleyMaterial = new THREE.MeshPhysicalMaterial({ color: 0x8b96aa, metalness: 1, roughness: .16, clearcoat: .75, clearcoatRoughness: .1 });
const pulleyGroup = new THREE.Group();
pulleyGroup.position.set(hoist.x, hoist.pulleyY, hoist.z);
const wheel = new THREE.Mesh(new THREE.TorusGeometry(.045, .008, 8, 20), pulleyMaterial);
pulleyGroup.add(wheel);
const pulleyAxle = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .11, 12), pulleyMaterial);
pulleyAxle.rotation.x = Math.PI / 2;
pulleyGroup.add(pulleyAxle);
scene.add(pulleyGroup);

const halyardPoints = [
  new THREE.Vector3(hoist.x, hoist.topY, hoist.z),
  new THREE.Vector3(hoist.x + .038, hoist.pulleyY - .028, hoist.z),
  new THREE.Vector3(hoist.x + .045, hoist.pulleyY + .012, hoist.z),
  new THREE.Vector3(hoist.x, hoist.pulleyY + .045, hoist.z),
  new THREE.Vector3(hoist.x - .045, hoist.pulleyY + .012, hoist.z),
  new THREE.Vector3(hoist.x - .052, hoist.pulleyY - .015, hoist.z),
  new THREE.Vector3(hoist.x - .052, rig.poleBottom + .22, hoist.z),
  new THREE.Vector3(hoist.x - .052, rig.poleBottom + .10, hoist.z)
];
const halyardCurve = new THREE.CatmullRomCurve3(halyardPoints, false, "centripetal", 0.35);
const halyard = new THREE.Mesh(new THREE.TubeGeometry(halyardCurve, 56, .008, 7, false), ropeMaterial);
scene.add(halyard);

// Two small metal grommets sit on the hoist edge of the flag. The pulley
// wheels remain at the cap; the thin halyard runs down the back of the pole.
const grommetMaterial = new THREE.MeshPhysicalMaterial({ color: 0xa9b3c4, metalness: 1, roughness: .22, clearcoat: .7, clearcoatRoughness: .12 });
const grommets = new THREE.Group();
for (const t of [0, 1]) {
  const grommet = new THREE.Mesh(new THREE.TorusGeometry(.032, .007, 8, 20), grommetMaterial);
  grommet.position.copy(hoist.point(t));
  grommets.add(grommet);
}
scene.add(grommets);

// A UV-mapped inverted sphere makes the EXR visibly rotatable around the camera.
const backgroundDomeMaterial = new THREE.MeshBasicMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false });
const backgroundDome = new THREE.Mesh(new THREE.SphereGeometry(50, 64, 32), backgroundDomeMaterial);
backgroundDome.renderOrder = -100;
scene.add(backgroundDome);

// A half-neighbourhood is sufficient for an unordered spatial hash: each
// pair of adjacent cells is visited once instead of once from both sides.
const collisionOffsets = [];
for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) for (let oz = -1; oz <= 1; oz++) {
  if (ox > 0 || (ox === 0 && oy > 0) || (ox === 0 && oy === 0 && oz >= 0)) collisionOffsets.push([ox, oy, oz]);
}

class ClothSimulation {
  constructor(width = 2.9, height = rig.flagHeight, cols = 48, rows = 30) {
    this.width = width; this.height = height; this.cols = cols; this.rows = rows;
    // Keep the physical cloth grid modest for collision performance, while
    // rendering a denser interpolated surface so the silhouette does not
    // expose the simulation cells at close camera distances.
    this.renderCols = cols * 1; this.renderRows = rows * 1;
    this.count = (cols + 1) * (rows + 1);
    this.positions = new Float32Array(this.count * 3);
    this.previous = new Float32Array(this.count * 3);
    this.rest = new Float32Array(this.count * 3);
    this.contactNormals = new Float32Array(this.count * 3);
    this.pinned = new Uint8Array(this.count);
    this.constraints = [];
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();
    this.tmp3 = new THREE.Vector3();
    this.tmp4 = new THREE.Vector3();
    this.tmp5 = new THREE.Vector3();
    this.tmp6 = new THREE.Vector3();
    this.windVector = new THREE.Vector3();
    this.windDirection = new THREE.Vector3();
    this.reset();
    this.buildConstraints();
    // X is the hoist-to-fly direction; the pinned column is therefore the
    // actual left edge of the flag, directly beside the pole.
    this.geometry = new THREE.PlaneGeometry(width, height, this.renderCols, this.renderRows);
    this.geometry.translate(-width / 2, height / 2, 0);
    this.positionAttribute = this.geometry.attributes.position;
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    const defaultCanvas = this.makeDefaultFlag();
    // A flag is a porous, matte textile: broad soft highlights, slight
    // subsurface/transmitted light, and no clear-coat shell or metallic sheen.
    this.material = new THREE.MeshPhysicalMaterial({
      map: new THREE.CanvasTexture(defaultCanvas),
      side: THREE.DoubleSide,
      roughness: .82,
      metalness: 0,
      sheen: .2,
      sheenColor: new THREE.Color(0xffb7a5),
      sheenRoughness: .72,
      clearcoat: 0,
      specularIntensity: .16,
      transmission: .1,
      thickness: .006,
      ior: 1.2,
      transparent: true,
      opacity: .94,
      alphaTest: .02
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.set(hoist.x + width / 2, hoist.topY - height / 2, 0.04);
  }

  makeDefaultFlag() {
    const canvas = document.createElement("canvas"); canvas.width = 800; canvas.height = 520;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#e84935"; ctx.fillRect(0, 0, 800, 520);
    ctx.fillStyle = "#f07a5e"; ctx.globalAlpha = .32; ctx.fillRect(0, 0, 800, 30); ctx.fillRect(0, 490, 800, 30);
    ctx.strokeStyle = "#fff4e7"; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(165, 125); ctx.lineTo(205, 187); ctx.lineTo(165, 250); ctx.lineTo(205, 313); ctx.lineTo(165, 375); ctx.stroke();
    ctx.fillStyle = "#fff4e7"; ctx.font = "600 42px Space Grotesk, sans-serif"; ctx.letterSpacing = "10px"; ctx.fillText("SIGNAL", 280, 267);
    return canvas;
  }

  reset() {
    for (let y = 0; y <= this.rows; y++) {
      for (let x = 0; x <= this.cols; x++) {
        const i = this.index(x, y); const p = i * 3;
        const px = x / this.cols * this.width - this.width / 2;
        const py = this.height / 2 - y / this.rows * this.height;
        const seed = x === 0 ? 0 : 0.03 * Math.sin(x * 1.37 + y * 2.11) * Math.sin(Math.PI * x / this.cols);
        this.positions[p] = px; this.positions[p + 1] = py; this.positions[p + 2] = seed;
        this.previous[p] = px; this.previous[p + 1] = py; this.previous[p + 2] = seed;
        this.rest[p] = px; this.rest[p + 1] = py; this.rest[p + 2] = 0;
        if (x === 0) this.pinned[i] = 1;
      }
    }
  }

  index(x, y) { return y * (this.cols + 1) + x; }

  buildConstraints() {
    const add = (a, b, stiffness) => this.constraints.push({ a, b, distance: this.distance(a, b), stiffness });
    for (let y = 0; y <= this.rows; y++) for (let x = 0; x <= this.cols; x++) {
      // Inextensible warp/weft and shear; only the longer bend springs stay
      // soft, so wind can fold the fabric without stretching its silhouette.
      if (x < this.cols) add(this.index(x, y), this.index(x + 1, y), .985);
      if (y < this.rows) add(this.index(x, y), this.index(x, y + 1), .985);
      // Diagonal shear constraints are softer than warp/weft so diagonal
      // creases can form without allowing elastic skew.
      if (x < this.cols && y < this.rows) { add(this.index(x, y), this.index(x + 1, y + 1), .96); add(this.index(x + 1, y), this.index(x, y + 1), .96); }
    }
  }

  distance(a, b) { const ap = a * 3; const bp = b * 3; const dx = this.rest[ap] - this.rest[bp]; const dy = this.rest[ap + 1] - this.rest[bp + 1]; return Math.hypot(dx, dy); }

  resolveSelfCollisions() {
    const cellSize = .06;
    const minimumDistance = .042;
    const buckets = new Map();
    const width = this.cols + 1;
    // Coordinates stay well within +/-512 cells in the current scene. Numeric
    // keys avoid allocating thousands of comma-joined strings per pass.
    const cellKey = (x, y, z) => {
      const cx = Math.floor(x / cellSize) + 512;
      const cy = Math.floor(y / cellSize) + 512;
      const cz = Math.floor(z / cellSize) + 512;
      return cx * 1048576 + cy * 1024 + cz;
    };
    for (let i = 0; i < this.count; i++) {
      const p = i * 3;
      const key = cellKey(this.positions[p], this.positions[p + 1], this.positions[p + 2]);
      let bucket = buckets.get(key);
      if (!bucket) buckets.set(key, bucket = []);
      bucket.push(i);
    }
    for (let i = 0; i < this.count; i++) {
      const p = i * 3;
      const cx = Math.floor(this.positions[p] / cellSize);
      const cy = Math.floor(this.positions[p + 1] / cellSize);
      const cz = Math.floor(this.positions[p + 2] / cellSize);
      const ix = i % width;
      const iy = Math.floor(i / width);
      for (const [ox, oy, oz] of collisionOffsets) {
        const bucket = buckets.get(cellKey((cx + ox) * cellSize, (cy + oy) * cellSize, (cz + oz) * cellSize));
        if (!bucket) continue;
        for (const j of bucket) {
          if (ox === 0 && oy === 0 && oz === 0 && j <= i) continue;
          const jx = j % width;
          const jy = Math.floor(j / width);
          // Structural neighbours already have distance constraints; only
          // repel non-local layers that fold through one another.
          if (Math.abs(ix - jx) <= 2 && Math.abs(iy - jy) <= 2) continue;
          const q = j * 3;
          const dx = this.positions[q] - this.positions[p];
          const dy = this.positions[q + 1] - this.positions[p + 1];
          const dz = this.positions[q + 2] - this.positions[p + 2];
          const distance = Math.hypot(dx, dy, dz);
          if (distance >= minimumDistance) continue;
          const safeDistance = distance || .0001;
          const correction = (minimumDistance - safeDistance) / safeDistance * .5;
          const moveI = this.pinned[i] ? 0 : correction;
          const moveJ = this.pinned[j] ? 0 : correction;
          const total = moveI + moveJ || 1;
          if (!this.pinned[i]) { this.positions[p] -= dx * moveI / total; this.positions[p + 1] -= dy * moveI / total; this.positions[p + 2] -= dz * moveI / total; }
          if (!this.pinned[j]) { this.positions[q] += dx * moveJ / total; this.positions[q + 1] += dy * moveJ / total; this.positions[q + 2] += dz * moveJ / total; }
          const nx = -dx / safeDistance; const ny = -dy / safeDistance; const nz = -dz / safeDistance;
          if (!this.pinned[i]) { this.contactNormals[p] += nx; this.contactNormals[p + 1] += ny; this.contactNormals[p + 2] += nz; }
          if (!this.pinned[j]) { this.contactNormals[q] -= nx; this.contactNormals[q + 1] -= ny; this.contactNormals[q + 2] -= nz; }
        }
      }
    }
  }

  // The pole is a real static collider, not a target pose: cloth vertices
  // may slide around it but cannot pass through its cylindrical surface.
  resolvePoleCollision() {
    const poleLocalX = -this.width / 2;
    const poleLocalZ = hoist.z - this.mesh.position.z;
    const minimumDistance = .064;
    for (let i = 0; i < this.count; i++) {
      if (this.pinned[i]) continue;
      const p = i * 3;
      const dx = this.positions[p] - poleLocalX;
      const dz = this.positions[p + 2] - poleLocalZ;
      const distance = Math.hypot(dx, dz);
      if (distance >= minimumDistance) continue;
      const safeDistance = distance || .0001;
      const correction = (minimumDistance - safeDistance) / safeDistance;
      this.positions[p] += dx * correction;
      this.positions[p + 2] += dz * correction;
      this.contactNormals[p] += dx / safeDistance;
      this.contactNormals[p + 2] += dz / safeDistance;
    }
  }

  applyContactVelocityResponse() {
    for (let i = 0; i < this.count; i++) {
      const p = i * 3;
      const nx = this.contactNormals[p]; const ny = this.contactNormals[p + 1]; const nz = this.contactNormals[p + 2];
      const normalLength = Math.hypot(nx, ny, nz);
      if (normalLength < 0.0001) continue;
      const invNormalLength = 1 / normalLength;
      const normalX = nx * invNormalLength; const normalY = ny * invNormalLength; const normalZ = nz * invNormalLength;
      const vx = this.positions[p] - this.previous[p];
      const vy = this.positions[p + 1] - this.previous[p + 1];
      const vz = this.positions[p + 2] - this.previous[p + 2];
      const inwardSpeed = vx * normalX + vy * normalY + vz * normalZ;
      if (inwardSpeed < 0) {
        this.previous[p] += normalX * inwardSpeed;
        this.previous[p + 1] += normalY * inwardSpeed;
        this.previous[p + 2] += normalZ * inwardSpeed;
      }
    }
  }

  updateRenderGeometry() {
    const array = this.positionAttribute.array;
    const renderWidth = this.renderCols + 1;
    const simulationWidth = this.cols + 1;
    for (let y = 0; y <= this.renderRows; y++) {
      const simulationY = y / this.renderRows * this.rows;
      const y0 = Math.floor(simulationY);
      const y1 = Math.min(this.rows, y0 + 1);
      const fy = simulationY - y0;
      for (let x = 0; x <= this.renderCols; x++) {
        const simulationX = x / this.renderCols * this.cols;
        const x0 = Math.floor(simulationX);
        const x1 = Math.min(this.cols, x0 + 1);
        const fx = simulationX - x0;
        const a = (y0 * simulationWidth + x0) * 3;
        const b = (y0 * simulationWidth + x1) * 3;
        const c = (y1 * simulationWidth + x0) * 3;
        const d = (y1 * simulationWidth + x1) * 3;
        const wA = (1 - fx) * (1 - fy); const wB = fx * (1 - fy);
        const wC = (1 - fx) * fy; const wD = fx * fy;
        const p = (y * renderWidth + x) * 3;
        array[p] = this.positions[a] * wA + this.positions[b] * wB + this.positions[c] * wC + this.positions[d] * wD;
        array[p + 1] = this.positions[a + 1] * wA + this.positions[b + 1] * wB + this.positions[c + 1] * wC + this.positions[d + 1] * wD;
        array[p + 2] = this.positions[a + 2] * wA + this.positions[b + 2] * wB + this.positions[c + 2] * wC + this.positions[d + 2] * wD;
      }
    }
    this.positionAttribute.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  pinToRope() {
    for (let y = 0; y <= this.rows; y++) {
      const i = this.index(0, y) * 3;
      const t = y / this.rows;
      const point = hoist.point(t);
      const localX = point.x - this.mesh.position.x;
      const localY = point.y - this.mesh.position.y;
      const localZ = point.z - this.mesh.position.z;
      this.positions[i] = localX; this.positions[i + 1] = localY; this.positions[i + 2] = localZ;
      this.previous[i] = localX; this.previous[i + 1] = localY; this.previous[i + 2] = localZ;
    }
  }

  step(dt, windSpeed, gustiness, time, autoWind) {
    this.contactNormals.fill(0);
    const dt2 = Math.min(dt, 1 / 30) ** 2;
    const wind = windSpeed / 100;
    // The squared pressure below gives the sail a real speed response:
    // doubling wind speed produces roughly four times the pressure.
    const windStrength = (windSpeed / 58) * (0.78 + gustiness / 100 * .52);
    // The wind direction is the only preferred travel direction. All motion
    // below comes from aerodynamic pressure/drag, gravity, and PBD solving.
    // A rising crosswind makes the free edge climb naturally through drag;
    // it is still applied only as airflow, never as a vertex target.
    // The dominant component is normal to the flag surface, so pressure
    // inflates the cloth instead of dragging its whole frame upward. Small
    // horizontal/upward components make the fly edge rise naturally.
    this.windDirection.set(.70, .34, .62).normalize();
    if (autoWind) {
      // Keep the mean wind direction almost steady; the spatial gust field
      // below supplies natural variation without periodically releasing the
      // whole cloth in a synchronized pulse.
      this.windDirection.x += Math.sin(time * .42) * .012;
      this.windDirection.z += Math.cos(time * .36) * .008;
      this.windDirection.normalize();
    }
    this.windVector.copy(this.windDirection).multiplyScalar(windStrength);
    const inverseDt = 1 / Math.max(dt, 1 / 240);
    for (let y = 0; y <= this.rows; y++) for (let x = 0; x <= this.cols; x++) {
      const i = this.index(x, y); const p = i * 3;
      if (this.pinned[i]) continue;
      // Slightly damped spring motion gives folds a soft cloth-like return
      // instead of the rigid, rubber-sheet snap of over-constrained cloth.
      const damping = wind < .01 ? .86 : .90;
      const vx = (this.positions[p] - this.previous[p]) * damping;
      const vy = (this.positions[p + 1] - this.previous[p + 1]) * damping;
      const vz = (this.positions[p + 2] - this.previous[p + 2]) * damping;
      this.previous[p] = this.positions[p]; this.previous[p + 1] = this.positions[p + 1]; this.previous[p + 2] = this.positions[p + 2];
      const normalizedX = x / this.cols;
      const normalizedY = y / this.rows;
      // Continuous turbulent airflow: slow, spatially travelling variation
      // instead of a synchronized gust that inflates and releases the whole
      // flag at once.
      const gust = THREE.MathUtils.clamp(
        1 + Math.sin(time * .48 + normalizedX * 4.2 + normalizedY * 1.7) * (gustiness / 100) * .13
          + Math.sin(time * .86 - normalizedX * 7.1 + normalizedY * 4.8) * (gustiness / 100) * .06,
        .76, 1.24
      );
      const tangentX = this.tmp;
      const tangentY = this.tmp2;
      const normal = this.tmp3;
      const left = this.index(Math.max(0, x - 1), y) * 3;
      const right = this.index(Math.min(this.cols, x + 1), y) * 3;
      const above = this.index(x, Math.max(0, y - 1)) * 3;
      const below = this.index(x, Math.min(this.rows, y + 1)) * 3;
      tangentX.set(this.positions[right] - this.positions[left], this.positions[right + 1] - this.positions[left + 1], this.positions[right + 2] - this.positions[left + 2]);
      tangentY.set(this.positions[below] - this.positions[above], this.positions[below + 1] - this.positions[above + 1], this.positions[below + 2] - this.positions[above + 2]);
      normal.crossVectors(tangentX, tangentY).normalize();
      // Aerodynamic pressure is applied only through the local surface
      // normal. Folded/back-facing layers therefore lose the direct wind
      // impulse instead of being pushed through the front layer.
      // Dynamic pressure is the signed square of flow through the local
      // surface. Tangential drag uses the remaining relative flow; neither
      // term prescribes where a vertex should be.
      const flow = this.tmp5.copy(this.windDirection).multiplyScalar(windStrength * gust);
      const velocity = this.tmp6.set(
        (this.positions[p] - this.previous[p]) * inverseDt,
        (this.positions[p + 1] - this.previous[p + 1]) * inverseDt,
        (this.positions[p + 2] - this.previous[p + 2]) * inverseDt
      );
      // Relative-air velocity provides continuous aerodynamic damping. This
      // removes accumulated cloth momentum instead of letting the flag build
      // up a large swing and then snap back as one rigid pulse.
      flow.sub(velocity.multiplyScalar(.32));
      const normalWind = normal.dot(flow);
      const pressure = THREE.MathUtils.clamp(normalWind * Math.abs(normalWind) * (0.95 + normalizedX * 1.15), -1.45, 1.45);
      const normalForce = this.tmp4.copy(normal).multiplyScalar(pressure * 4.2);
      const tangentForce = flow.addScaledVector(normal, -normalWind).multiplyScalar(.32);
      const forceX = normalForce.x + tangentForce.x;
      const forceY = normalForce.y + tangentForce.y;
      const forceZ = normalForce.z + tangentForce.z;
      const aerodynamicScale = 5.2;
      this.positions[p] += vx + forceX * dt2 * aerodynamicScale;
      this.positions[p + 1] += vy - 9.8 * dt2 + forceY * dt2 * aerodynamicScale;
      this.positions[p + 2] += vz + forceZ * dt2 * aerodynamicScale;
    }
    for (let iteration = 0; iteration < 12; iteration++) {
      for (const c of this.constraints) {
        const ap = c.a * 3; const bp = c.b * 3;
        const dx = this.positions[bp] - this.positions[ap]; const dy = this.positions[bp + 1] - this.positions[ap + 1]; const dz = this.positions[bp + 2] - this.positions[ap + 2];
        const length = Math.hypot(dx, dy, dz) || 0.0001;
        const correction = (length - c.distance) / length * c.stiffness;
        const aPinned = this.pinned[c.a]; const bPinned = this.pinned[c.b];
        if (!aPinned && !bPinned) { this.positions[ap] += dx * correction * .5; this.positions[ap + 1] += dy * correction * .5; this.positions[ap + 2] += dz * correction * .5; this.positions[bp] -= dx * correction * .5; this.positions[bp + 1] -= dy * correction * .5; this.positions[bp + 2] -= dz * correction * .5; }
        else if (aPinned && !bPinned) { this.positions[bp] -= dx * correction; this.positions[bp + 1] -= dy * correction; this.positions[bp + 2] -= dz * correction; }
        else if (!aPinned && bPinned) { this.positions[ap] += dx * correction; this.positions[ap + 1] += dy * correction; this.positions[ap + 2] += dz * correction; }
      }
      // Collision projection is the expensive part of the solver. Three
      // passes are enough to keep folded layers apart while the cheaper
      // distance constraints restore inextensibility on every iteration.
      if (iteration === 2 || iteration === 6 || iteration === 10) this.resolveSelfCollisions();
      this.resolvePoleCollision();
      this.pinToRope();
    }
    // A final contact projection removes any residual inter-layer overlap
    // after the inextensibility solve; it does not prescribe a pose.
    this.contactNormals.fill(0);
    this.resolveSelfCollisions();
    this.resolvePoleCollision();
    this.pinToRope();
    this.applyContactVelocityResponse();
    this.updateRenderGeometry();
  }

  setWidth(width) {
    if (Math.abs(this.width - width) < 0.0001) return;
    this.width = width;
    this.positions = new Float32Array(this.count * 3);
    this.previous = new Float32Array(this.count * 3);
    this.rest = new Float32Array(this.count * 3);
    this.contactNormals = new Float32Array(this.count * 3);
    this.pinned = new Uint8Array(this.count);
    this.constraints = [];
    this.reset();
    this.buildConstraints();

    const oldGeometry = this.geometry;
    this.geometry = new THREE.PlaneGeometry(width, this.height, this.renderCols, this.renderRows);
    this.geometry.translate(-width / 2, this.height / 2, 0);
    this.positionAttribute = this.geometry.attributes.position;
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.mesh.geometry = this.geometry;
    oldGeometry.dispose();
    this.mesh.position.set(hoist.x + width / 2, hoist.topY - this.height / 2, 0.04);
    this.updateRenderGeometry();
  }

  setTexture(texture) { texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = renderer.capabilities.getMaxAnisotropy(); this.material.map?.dispose(); this.material.map = texture; this.material.needsUpdate = true; }
}

const cloth = new ClothSimulation();
scene.add(cloth.mesh);

function setCameraFromUI() {
  const azimuth = THREE.MathUtils.degToRad(Number($("cameraAzimuth").value));
  const elevation = THREE.MathUtils.degToRad(Number($("cameraElevation").value));
  const distance = Number($("cameraDistance").value);
  const polar = Math.PI / 2 - elevation;
  camera.position.set(Math.sin(azimuth) * Math.sin(polar) * distance, Math.cos(polar) * distance + cameraTarget.y, Math.cos(azimuth) * Math.sin(polar) * distance);
  camera.lookAt(cameraTarget); controls.target.copy(cameraTarget); controls.update();
}

function syncCameraUI() {
  const offset = camera.position.clone().sub(cameraTarget); const spherical = new THREE.Spherical().setFromVector3(offset);
  const azimuth = THREE.MathUtils.radToDeg(spherical.theta); const elevation = 90 - THREE.MathUtils.radToDeg(spherical.phi);
  $("cameraAzimuth").value = THREE.MathUtils.clamp(azimuth, -70, 70); $("cameraElevation").value = THREE.MathUtils.clamp(elevation, -90, 90); $("cameraDistance").value = spherical.radius.toFixed(1); updateAllRangeProgress(); updateCameraLabels();
}
function updateCameraLabels() { $("azimuthValue").innerHTML = `${formatAngle($("cameraAzimuth").value)}<small>°</small>`; $("elevationValue").innerHTML = `${formatAngle($("cameraElevation").value)}<small>°</small>`; $("distanceValue").innerHTML = `${Number($("cameraDistance").value).toFixed(1)}<small>M</small>`; }
function formatAngle(value) { const number = Number(value); return number < 0 ? `−${Math.abs(number)}` : number; }
setCameraFromUI();

function updateAllRangeProgress() { document.querySelectorAll("input[type=range]").forEach((input) => { const percent = ((input.value - input.min) / (input.max - input.min)) * 100; input.style.setProperty("--range-progress", `${percent}%`); }); }
function updateSimulationLabels() { $("windValue").innerHTML = `${state.wind}<small>KM/H</small>`; $("gustValue").innerHTML = `${state.gustiness}<small>%</small>`; }
updateAllRangeProgress(); updateSimulationLabels();

for (const [file, label] of assets.environments) { const option = document.createElement("option"); option.value = `./exr/${file}`; option.textContent = label; option.dataset.label = label; $("environmentSelect").appendChild(option); }

// Keep restored browser form values from drifting away from the simulation
// state after a reload; the solver always starts from the declared defaults.
$("windSpeed").value = state.wind;
$("gustiness").value = state.gustiness;

const exrLoader = new EXRLoader();
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
function updateBackgroundRotation(value) {
  const radians = THREE.MathUtils.degToRad(Number(value));
  backgroundDome.rotation.y = -radians;
  if (scene.environment?.isTexture && scene.environmentRotation) scene.environmentRotation.y = radians;
  $("backgroundRotationValue").innerHTML = `${formatAngle(value)}<small>°</small>`;
}

async function loadEnvironment(url, label = "CUSTOM ATMOSPHERE") {
  $("environmentSelect").disabled = true;
  try {
    const texture = await exrLoader.loadAsync(url);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    scene.background = new THREE.Color(0x080b12);
    scene.environment = texture;
    const domeTexture = texture.clone();
    domeTexture.mapping = THREE.UVMapping;
    domeTexture.needsUpdate = true;
    backgroundDomeMaterial.map?.dispose();
    backgroundDomeMaterial.map = domeTexture;
    backgroundDomeMaterial.needsUpdate = true;
    updateBackgroundRotation($("backgroundRotation").value);
  } catch (error) {
    console.warn("EXR background could not be loaded", error);
    scene.background = new THREE.Color(0x0b1020);
  } finally { $("environmentSelect").disabled = false; }
}
loadEnvironment($("environmentSelect").value, $("environmentSelect").selectedOptions[0]?.dataset.label);

$("environmentSelect").addEventListener("change", () => { const option = $("environmentSelect").selectedOptions[0]; loadEnvironment(option.value, option.dataset.label); });
$("backgroundRotation").addEventListener("input", (event) => { updateBackgroundRotation(event.target.value); updateAllRangeProgress(); });
$("environmentUploadButton").addEventListener("click", () => $("environmentInput").click());
$("environmentInput").addEventListener("change", (event) => { const file = event.target.files[0]; if (!file) return; if (state.environmentUrl) URL.revokeObjectURL(state.environmentUrl); state.environmentUrl = URL.createObjectURL(file); loadEnvironment(state.environmentUrl, file.name.toUpperCase()); });

const flagTextureState = { source: cloth.makeDefaultFlag(), sourceAspect: null, name: "default / signal-red", type: "PROCEDURAL TEXTURE · 4:3", rotation: 0, mirrorX: false, mirrorY: false };

const DEFAULT_FLAG_WIDTH = 2.9;
// The compact uploaded-flag mesh is width:height = 2:1. This is wider than
// the default camera rig, but it lets 3:2 and portrait artwork fill the full
// hoist height while leaving unused fly-side pixels transparent.
const COMPACT_FLAG_WIDTH = rig.flagHeight * 2;

function getOrientedSourceAspect(source) {
  const sourceWidth = source.naturalWidth || source.videoWidth || source.width;
  const sourceHeight = source.naturalHeight || source.videoHeight || source.height;
  const quarterTurn = ((flagTextureState.rotation % 360) + 360) % 360;
  const aspect = flagTextureState.sourceAspect || (sourceWidth && sourceHeight ? sourceWidth / sourceHeight : 1);
  return quarterTurn === 90 || quarterTurn === 270 ? 1 / aspect : aspect;
}

function updateFlagMeshShape(source) {
  // Uploaded artwork up to 2:1 uses a compact 2:1 (width:height) cloth
  // mesh. The image is height-fitted, so the hoist edge reaches both rope
  // endpoints and any remaining area is transparent on the right.
  const isCompactUploadedFlag = flagTextureState.sourceAspect !== null && getOrientedSourceAspect(source) <= 2;
  cloth.setWidth(isCompactUploadedFlag ? COMPACT_FLAG_WIDTH : DEFAULT_FLAG_WIDTH);
}

async function prepareFlagSource(file) {
  const rawUrl = URL.createObjectURL(file);
  const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
  if (!isSvg) return { url: rawUrl, aspect: null };

  try {
    const markup = await file.text();
    const svgTagMatch = markup.match(/<svg\b[^>]*>/i);
    const viewBoxMatch = svgTagMatch?.[0].match(/\bviewBox\s*=\s*["']\s*[-+\d.e]+\s+[-+\d.e]+\s+([\d.e+-]+)\s+([\d.e+-]+)\s*["']/i);
    if (!svgTagMatch || !viewBoxMatch) return { url: rawUrl, aspect: null };
    const viewBoxWidth = Number(viewBoxMatch[1]);
    const viewBoxHeight = Number(viewBoxMatch[2]);
    if (!(viewBoxWidth > 0) || !(viewBoxHeight > 0)) return { url: rawUrl, aspect: null };

    // SVGs without explicit dimensions are often reported as 300x150 by the
    // browser. Give the image viewport the viewBox dimensions so a portrait
    // SVG remains portrait when rasterized into the cloth texture.
    let svgTag = svgTagMatch[0]
      .replace(/\swidth\s*=\s*(["']).*?\1/gi, "")
      .replace(/\sheight\s*=\s*(["']).*?\1/gi, "");
    svgTag = svgTag.replace(/<svg\b/i, `<svg width="${viewBoxWidth}" height="${viewBoxHeight}"`);
    const normalizedMarkup = markup.slice(0, svgTagMatch.index) + svgTag + markup.slice(svgTagMatch.index + svgTagMatch[0].length);
    const normalizedUrl = URL.createObjectURL(new Blob([normalizedMarkup], { type: "image/svg+xml" }));
    URL.revokeObjectURL(rawUrl);
    return { url: normalizedUrl, aspect: viewBoxWidth / viewBoxHeight };
  } catch (error) {
    console.warn("SVG metadata could not be read", file.name, error);
    return { url: rawUrl, aspect: null };
  }
}

function makeOrientedFlagCanvas(source) {
  const sourceWidth = source.naturalWidth || source.videoWidth || source.width;
  const sourceHeight = source.naturalHeight || source.videoHeight || source.height;
  if (!sourceWidth || !sourceHeight) return null;
  const quarterTurn = ((flagTextureState.rotation % 360) + 360) % 360;
  // Rasterize oversized SVGs at a bounded working size. This keeps the
  // upload path responsive while preserving the source aspect ratio exactly.
  const sourceScale = Math.min(1, 2048 / Math.max(sourceWidth, sourceHeight));
  const rasterWidth = Math.max(1, Math.round(sourceWidth * sourceScale));
  const rasterHeight = Math.max(1, Math.round(sourceHeight * sourceScale));
  const rotated = document.createElement("canvas");
  const quarterTurned = quarterTurn === 90 || quarterTurn === 270;
  rotated.width = quarterTurned ? rasterHeight : rasterWidth;
  rotated.height = quarterTurned ? rasterWidth : rasterHeight;
  const rotatedContext = rotated.getContext("2d");
  rotatedContext.translate(rotated.width / 2, rotated.height / 2);
  rotatedContext.rotate(THREE.MathUtils.degToRad(quarterTurn));
  rotatedContext.scale(flagTextureState.mirrorX ? -1 : 1, flagTextureState.mirrorY ? -1 : 1);
  rotatedContext.drawImage(source, -rasterWidth / 2, -rasterHeight / 2, rasterWidth, rasterHeight);

  // Preserve the complete artwork instead of using cover-cropping. The
  // hoist-side edge remains at x=0 so it stays aligned with the rope.
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = Math.round(canvas.width * cloth.height / cloth.width);
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  const scale = Math.min(canvas.width / rotated.width, canvas.height / rotated.height);
  const drawWidth = rotated.width * scale; const drawHeight = rotated.height * scale;
  const flagAspect = canvas.width / canvas.height;
  const sourceAspect = rotated.width / rotated.height;
  // A narrow/portrait flag uses the full physical height and leaves only
  // transparent space on the fly side. Do not vertically center it, so its
  // top edge reaches the top rope exactly.
  const offsetY = sourceAspect <= flagAspect ? 0 : (canvas.height - drawHeight) / 2;
  context.drawImage(rotated, 0, offsetY, drawWidth, drawHeight);
  return canvas;
}

function renderFlagTexture() {
  const canvas = makeOrientedFlagCanvas(flagTextureState.source);
  if (!canvas) return;
  cloth.setTexture(new THREE.CanvasTexture(canvas));
}

let flagTextureLoadId = 0;
async function loadFlagTexture(file) {
  const loadId = ++flagTextureLoadId;
  const prepared = await prepareFlagSource(file);
  if (loadId !== flagTextureLoadId) { URL.revokeObjectURL(prepared.url); return; }
  const url = prepared.url;
  if (state.customFlagUrl) URL.revokeObjectURL(state.customFlagUrl);
  state.customFlagUrl = url;
  const image = new Image();
  image.onload = () => {
    if (loadId !== flagTextureLoadId) return;
    flagTextureState.source = image;
    flagTextureState.sourceAspect = prepared.aspect || image.naturalWidth / image.naturalHeight;
    flagTextureState.name = file.name;
    const extension = file.name.includes(".") ? file.name.split(".").pop() : "image";
    const kind = (file.type || extension).split("/").pop().toUpperCase();
    flagTextureState.type = `${kind} · PROPORTIONAL TEXTURE`;
    updateFlagMeshShape(image);
    renderFlagTexture();
    $("flagFileName").textContent = flagTextureState.name;
    $("flagFileType").textContent = flagTextureState.type;
    const img = document.createElement("img"); img.src = url; $("flagThumb").replaceChildren(img);
  };
  image.onerror = () => { if (loadId === flagTextureLoadId) console.warn("Flag image could not be decoded", file.name); };
  image.decoding = "async";
  image.src = url;
}
$("flagUploadButton").addEventListener("click", () => $("flagInput").click()); $("flagInput").addEventListener("change", (event) => { const file = event.target.files[0]; if (file) loadFlagTexture(file); });
$("clearFlagButton").addEventListener("click", () => { flagTextureState.source = cloth.makeDefaultFlag(); flagTextureState.sourceAspect = null; flagTextureState.name = "default / signal-red"; flagTextureState.type = "PROCEDURAL TEXTURE · 4:3"; updateFlagMeshShape(flagTextureState.source); renderFlagTexture(); $("flagThumb").innerHTML = "<span>F</span>"; $("flagFileName").textContent = flagTextureState.name; $("flagFileType").textContent = flagTextureState.type; });
$("flagRotation")?.addEventListener("change", (event) => { flagTextureState.rotation = Number(event.target.value); updateFlagMeshShape(flagTextureState.source); renderFlagTexture(); });
$("flagMirror")?.addEventListener("change", (event) => { const value = event.target.value; flagTextureState.mirrorX = value === "horizontal" || value === "both"; flagTextureState.mirrorY = value === "vertical" || value === "both"; renderFlagTexture(); });

$("windSpeed").addEventListener("input", (event) => { state.wind = Number(event.target.value); updateSimulationLabels(); updateAllRangeProgress(); });
$("gustiness").addEventListener("input", (event) => { state.gustiness = Number(event.target.value); updateSimulationLabels(); updateAllRangeProgress(); }); $("autoWind").addEventListener("change", (event) => { state.autoWind = event.target.checked; });
for (const id of ["cameraAzimuth", "cameraElevation", "cameraDistance"]) $(id).addEventListener("input", () => { setCameraFromUI(); updateCameraLabels(); updateAllRangeProgress(); });
$("resetViewButton").addEventListener("click", () => { $("cameraAzimuth").value = -18; $("cameraElevation").value = 12; $("cameraDistance").value = 7.2; setCameraFromUI(); updateCameraLabels(); updateAllRangeProgress(); });
controls.addEventListener("change", syncCameraUI);

function onResize() { const rect = $("canvasHost").getBoundingClientRect(); renderer.setSize(rect.width, rect.height, false); camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix(); }
window.addEventListener("resize", onResize); onResize();

function animate(now) {
  requestAnimationFrame(animate); const dt = Math.min((now - state.lastFrame) / 1000, .05); state.lastFrame = now; state.time += dt;
  // One complete Verlet step preserves the actual acceleration. The solver's
  // constraint iterations provide the stability; two half-steps here were
  // more expensive and weakened gravity and wind response.
  cloth.step(dt, state.wind, state.gustiness, state.time, state.autoWind);
  backgroundDome.position.copy(camera.position);
  controls.update(); renderer.render(scene, camera);
  state.frames++;
}
requestAnimationFrame(animate);
