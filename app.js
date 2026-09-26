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
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
controls.minPolarAngle = THREE.MathUtils.degToRad(35);
controls.maxPolarAngle = THREE.MathUtils.degToRad(100);
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
  const t = index / 12;
  return new THREE.Vector3(
    rig.poleX,
    rig.poleTop - t * rig.flagHeight - 0.055 * Math.sin(t * Math.PI),
    0.16 + 0.045 * Math.sin(t * Math.PI)
  );
});
const ropeCurve = new THREE.CatmullRomCurve3(ropePoints);
const rope = new THREE.Mesh(new THREE.TubeGeometry(ropeCurve, 32, 0.016, 8, false), ropeMaterial);
scene.add(rope);

const pulleyMaterial = new THREE.MeshPhysicalMaterial({ color: 0x8b96aa, metalness: 1, roughness: .16, clearcoat: .75, clearcoatRoughness: .1 });
const pulleyGroup = new THREE.Group();
pulleyGroup.position.set(rig.poleX, rig.poleTop - .12, .2);
for (const offset of [-.055, .055]) {
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(.09, .014, 10, 24), pulleyMaterial);
  wheel.position.x = offset;
  pulleyGroup.add(wheel);
}
const pulleyAxle = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .18, 12), pulleyMaterial);
pulleyAxle.rotation.x = Math.PI / 2;
pulleyGroup.add(pulleyAxle);
scene.add(pulleyGroup);

const halyardPoints = [
  new THREE.Vector3(rig.poleX + .12, rig.poleTop - .015, .2),
  new THREE.Vector3(rig.poleX + .14, rig.poleTop - .22, .2),
  new THREE.Vector3(rig.poleX + .12, rig.poleBottom + .22, .2),
  new THREE.Vector3(rig.poleX + .1, rig.poleBottom + .08, .2)
];
const halyardCurve = new THREE.CatmullRomCurve3(halyardPoints);
const halyard = new THREE.Mesh(new THREE.TubeGeometry(halyardCurve, 48, .011, 7, false), ropeMaterial);
scene.add(halyard);

class ClothSimulation {
  constructor(width = 2.9, height = rig.flagHeight, cols = 58, rows = 36) {
    this.width = width; this.height = height; this.cols = cols; this.rows = rows;
    this.count = (cols + 1) * (rows + 1);
    this.positions = new Float32Array(this.count * 3);
    this.previous = new Float32Array(this.count * 3);
    this.rest = new Float32Array(this.count * 3);
    this.pinned = new Uint8Array(this.count);
    this.constraints = [];
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();
    this.windVector = new THREE.Vector3();
    this.reset();
    this.buildConstraints();
    this.geometry = new THREE.PlaneGeometry(width, height, cols, rows);
    this.geometry.rotateY(Math.PI / 2);
    this.geometry.translate(-width / 2, height / 2, 0);
    this.positionAttribute = this.geometry.attributes.position;
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    const defaultCanvas = this.makeDefaultFlag();
    this.material = new THREE.MeshPhysicalMaterial({ map: new THREE.CanvasTexture(defaultCanvas), side: THREE.DoubleSide, roughness: .56, metalness: .02, sheen: .5, sheenColor: new THREE.Color(0xffd5c4), sheenRoughness: .22, clearcoat: .08, alphaTest: .02 });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.set(rig.poleX + width / 2, rig.poleTop - height / 2, 0.04);
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
        this.positions[p] = px; this.positions[p + 1] = py; this.positions[p + 2] = 0;
        this.previous[p] = px; this.previous[p + 1] = py; this.previous[p + 2] = 0;
        this.rest[p] = px; this.rest[p + 1] = py; this.rest[p + 2] = 0;
        if (x === 0) this.pinned[i] = 1;
      }
    }
  }

  index(x, y) { return y * (this.cols + 1) + x; }

  buildConstraints() {
    const add = (a, b, stiffness) => this.constraints.push({ a, b, distance: this.distance(a, b), stiffness });
    for (let y = 0; y <= this.rows; y++) for (let x = 0; x <= this.cols; x++) {
      if (x < this.cols) add(this.index(x, y), this.index(x + 1, y), .97);
      if (y < this.rows) add(this.index(x, y), this.index(x, y + 1), .97);
      if (x < this.cols && y < this.rows) { add(this.index(x, y), this.index(x + 1, y + 1), .82); add(this.index(x + 1, y), this.index(x, y + 1), .82); }
      if (x < this.cols - 1) add(this.index(x, y), this.index(x + 2, y), .12);
      if (y < this.rows - 1) add(this.index(x, y), this.index(x, y + 2), .12);
    }
  }

  distance(a, b) { const ap = a * 3; const bp = b * 3; const dx = this.rest[ap] - this.rest[bp]; const dy = this.rest[ap + 1] - this.rest[bp + 1]; return Math.hypot(dx, dy); }

  pinToRope() {
    for (let y = 0; y <= this.rows; y++) {
      const i = this.index(0, y) * 3; const py = this.height / 2 - y / this.rows * this.height;
      const t = y / this.rows;
      const ropeX = rig.poleX;
      const ropeY = rig.poleTop - t * this.height - 0.055 * Math.sin(t * Math.PI);
      const ropeZ = 0.16 + 0.045 * Math.sin(t * Math.PI);
      const localX = ropeX - this.mesh.position.x;
      const localY = ropeY - this.mesh.position.y;
      const localZ = ropeZ - this.mesh.position.z;
      this.positions[i] = localX; this.positions[i + 1] = localY; this.positions[i + 2] = localZ;
      this.previous[i] = localX; this.previous[i + 1] = localY; this.previous[i + 2] = localZ;
    }
  }

  step(dt, windSpeed, gustiness, time, autoWind) {
    const dt2 = Math.min(dt, 1 / 30) ** 2;
    const wind = windSpeed / 100;
    // A broad streamwise component keeps the silk open; the smaller normal
    // component creates the deep rolling folds without collapsing the sail.
    this.windVector.set(1.6 + wind * 8.0, 0, 2.8 + wind * 4.0);
    for (let y = 0; y <= this.rows; y++) for (let x = 0; x <= this.cols; x++) {
      const i = this.index(x, y); const p = i * 3;
      if (this.pinned[i]) continue;
      const vx = (this.positions[p] - this.previous[p]) * .985;
      const vy = (this.positions[p + 1] - this.previous[p + 1]) * .985;
      const vz = (this.positions[p + 2] - this.previous[p + 2]) * .985;
      this.previous[p] = this.positions[p]; this.previous[p + 1] = this.positions[p + 1]; this.previous[p + 2] = this.positions[p + 2];
      const normalizedX = x / this.cols;
      const gust = 0.76 + Math.sin(time * 1.8 + normalizedX * 9.0) * 0.34 + Math.sin(time * 3.9 + y * 1.6) * .22;
      const silkWave = Math.sin(time * 2.6 + normalizedX * 11.0 + (y / this.rows) * 4.0) * 0.55;
      const swirl = autoWind ? Math.sin(time * .74) * normalizedX * .48 : 0;
      const forceX = this.windVector.x * (gust * gustiness / 100) + swirl;
      const forceZ = this.windVector.z * (gust * gustiness / 100) * (0.52 + normalizedX * .8) + silkWave * this.windVector.z * (0.46 + normalizedX * .35);
      const edgeFlutter = normalizedX * normalizedX * (Math.sin(time * 5.2 + y * .92) + Math.sin(time * 7.1 - y * .47) * .5);
      this.positions[p] += vx + forceX * dt2 * 2.8;
      this.positions[p + 1] += vy - 1.5 * dt2 + edgeFlutter * (2.2 + wind * 4.2) * dt2 * 5.4;
      this.positions[p + 2] += vz + forceZ * dt2 * 2.1;
    }
    for (let iteration = 0; iteration < 9; iteration++) {
      for (const c of this.constraints) {
        const ap = c.a * 3; const bp = c.b * 3;
        const dx = this.positions[bp] - this.positions[ap]; const dy = this.positions[bp + 1] - this.positions[ap + 1]; const dz = this.positions[bp + 2] - this.positions[ap + 2];
        const length = Math.hypot(dx, dy, dz) || 0.0001; const correction = (length - c.distance) / length * c.stiffness;
        const aPinned = this.pinned[c.a]; const bPinned = this.pinned[c.b];
        if (!aPinned && !bPinned) { this.positions[ap] += dx * correction * .5; this.positions[ap + 1] += dy * correction * .5; this.positions[ap + 2] += dz * correction * .5; this.positions[bp] -= dx * correction * .5; this.positions[bp + 1] -= dy * correction * .5; this.positions[bp + 2] -= dz * correction * .5; }
        else if (aPinned && !bPinned) { this.positions[bp] -= dx * correction; this.positions[bp + 1] -= dy * correction; this.positions[bp + 2] -= dz * correction; }
        else if (!aPinned && bPinned) { this.positions[ap] += dx * correction; this.positions[ap + 1] += dy * correction; this.positions[ap + 2] += dz * correction; }
      }
      this.pinToRope();
      const floor = -this.height / 2 - 0.08;
      for (let y = 0; y <= this.rows; y++) for (let x = 1; x <= this.cols; x++) {
        const p = this.index(x, y) * 3;
        if (this.positions[p + 1] < floor) { this.positions[p + 1] = floor; this.previous[p + 1] = floor; }
      }
    }
    for (let i = 0; i < this.count; i++) { const p = i * 3; this.positionAttribute.array[p] = this.positions[p]; this.positionAttribute.array[p + 1] = this.positions[p + 1]; this.positionAttribute.array[p + 2] = this.positions[p + 2]; }
    this.positionAttribute.needsUpdate = true; this.geometry.computeVertexNormals();
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
  $("cameraAzimuth").value = THREE.MathUtils.clamp(azimuth, -70, 70); $("cameraElevation").value = THREE.MathUtils.clamp(elevation, -10, 55); $("cameraDistance").value = spherical.radius.toFixed(1); updateAllRangeProgress(); updateCameraLabels();
}
function updateCameraLabels() { $("azimuthValue").innerHTML = `${formatAngle($("cameraAzimuth").value)}<small>°</small>`; $("elevationValue").innerHTML = `${formatAngle($("cameraElevation").value)}<small>°</small>`; $("distanceValue").innerHTML = `${Number($("cameraDistance").value).toFixed(1)}<small>M</small>`; }
function formatAngle(value) { const number = Number(value); return number < 0 ? `−${Math.abs(number)}` : number; }
setCameraFromUI();

function updateAllRangeProgress() { document.querySelectorAll("input[type=range]").forEach((input) => { const percent = ((input.value - input.min) / (input.max - input.min)) * 100; input.style.setProperty("--range-progress", `${percent}%`); }); }
function updateSimulationLabels() { $("windValue").innerHTML = `${state.wind}<small>KM/H</small>`; $("gustValue").innerHTML = `${state.gustiness}<small>%</small>`; }
updateAllRangeProgress(); updateSimulationLabels();

for (const [file, label] of assets.environments) { const option = document.createElement("option"); option.value = `./exr/${file}`; option.textContent = label; option.dataset.label = label; $("environmentSelect").appendChild(option); }

const exrLoader = new EXRLoader();
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
function updateBackgroundRotation(value) {
  const radians = THREE.MathUtils.degToRad(Number(value));
  if (scene.background?.isTexture) {
    if (scene.backgroundRotation) scene.backgroundRotation.y = radians;
    else { scene.background.center.set(.5, .5); scene.background.rotation = radians; }
  }
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
    scene.background = texture;
    scene.environment = texture;
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

function loadFlagTexture(file) {
  const url = URL.createObjectURL(file); if (state.customFlagUrl) URL.revokeObjectURL(state.customFlagUrl); state.customFlagUrl = url;
  new THREE.TextureLoader().load(url, (texture) => { cloth.setTexture(texture); $("flagFileName").textContent = file.name; $("flagFileType").textContent = `${file.type.split("/").pop().toUpperCase()} · UPLOADED TEXTURE`; const img = document.createElement("img"); img.src = url; $("flagThumb").replaceChildren(img); });
}
$("flagUploadButton").addEventListener("click", () => $("flagInput").click()); $("flagInput").addEventListener("change", (event) => { const file = event.target.files[0]; if (file) loadFlagTexture(file); });
$("clearFlagButton").addEventListener("click", () => { cloth.setTexture(new THREE.CanvasTexture(cloth.makeDefaultFlag())); $("flagThumb").innerHTML = "<span>F</span>"; $("flagFileName").textContent = "default / signal-red"; $("flagFileType").textContent = "PROCEDURAL TEXTURE · 4:3"; });

$("windSpeed").addEventListener("input", (event) => { state.wind = Number(event.target.value); updateSimulationLabels(); updateAllRangeProgress(); });
$("gustiness").addEventListener("input", (event) => { state.gustiness = Number(event.target.value); updateSimulationLabels(); updateAllRangeProgress(); }); $("autoWind").addEventListener("change", (event) => { state.autoWind = event.target.checked; });
for (const id of ["cameraAzimuth", "cameraElevation", "cameraDistance"]) $(id).addEventListener("input", () => { setCameraFromUI(); updateCameraLabels(); updateAllRangeProgress(); });
$("resetViewButton").addEventListener("click", () => { $("cameraAzimuth").value = -18; $("cameraElevation").value = 12; $("cameraDistance").value = 7.2; setCameraFromUI(); updateCameraLabels(); updateAllRangeProgress(); });
controls.addEventListener("change", syncCameraUI);

function onResize() { const rect = $("canvasHost").getBoundingClientRect(); renderer.setSize(rect.width, rect.height, false); camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix(); }
window.addEventListener("resize", onResize); onResize();

function animate(now) {
  requestAnimationFrame(animate); const dt = Math.min((now - state.lastFrame) / 1000, .05); state.lastFrame = now; state.time += dt;
  for (let i = 0; i < 2; i++) cloth.step(dt / 2, state.wind, state.gustiness, state.time, state.autoWind);
  controls.update(); renderer.render(scene, camera);
  state.frames++;
}
requestAnimationFrame(animate);
