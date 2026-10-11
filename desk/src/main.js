import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Color,
  Fog,
  Group,
  Mesh,
  Sprite,
  SpriteMaterial,
  PlaneGeometry,
  BoxGeometry,
  CylinderGeometry,
  ConeGeometry,
  TorusGeometry,
  LatheGeometry,
  CircleGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  CanvasTexture,
  SRGBColorSpace,
  RepeatWrapping,
  SpotLight,
  HemisphereLight,
  Vector2,
  Vector3,
  Raycaster,
  PMREMGenerator,
  PCFShadowMap,
  NeutralToneMapping,
  FrontSide,
  BackSide,
  DoubleSide,
  AdditiveBlending,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { pages, cardArt, latteArt, woodArt, softDot, SPREAD } from "./pages.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PW = 1.4; // page size perpendicular to the spine
const PL = 1.9; // page size along the spine
const CW = PW + 0.06; // cover is a bit larger than the pages
const CL = PL + 0.08;
const BOARD = 0.025; // cover board thickness
const EPS = 0.004; // gap between stacked leaves
const SEG = 28; // bend resolution of a leaf
const BEND = 1.1; // how much a turning page curls
const TEX_U = 1024; // texture px across the page (perpendicular to the spine)
const TEX_V = Math.round((TEX_U * PL) / PW);

// Leaf 0 is the front cover. Spread n shows leaf[n-1].back | leaf[n].front.
const LEAVES = [
  ["coverFront", "coverInside"],
  ["contents", "about"],
  ["skills", "colorComposerVisual"],
  ["colorComposerText", "ssgVisual"],
  ["ssgText", "nextChapter"],
  ["contact", "backInside"],
];
const MAX_SPREAD = LEAVES.length - 1;
const SPREAD_LABELS = [
  "Cover",
  "Contents",
  "About",
  "Color Composer",
  "Static Site Generator",
  "Get in touch",
];

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FLIP_TIME = reducedMotion ? 0.25 : 0.95;

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------

const $ = (s) => document.querySelector(s);
const canvasEl = $("#scene");
const ui = {
  root: document.body,
  label: $("#spread-label"),
  prev: $("#prev"),
  next: $("#next"),
  close: $("#close"),
  loader: $("#loader"),
};

let renderer;
try {
  renderer = new WebGLRenderer({
    canvas: canvasEl,
    antialias: true,
    powerPreference: "high-performance",
  });
} catch (e) {
  document.body.classList.add("no-webgl");
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = SRGBColorSpace;
renderer.toneMapping = NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;
const maxAniso = renderer.capabilities.getMaxAnisotropy();

const scene = new Scene();
scene.background = new Color(0x050505);
scene.fog = new Fog(0x050505, 7, 16);
const pmrem = new PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.22;

const camera = new PerspectiveCamera(32, 1, 0.1, 60);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------

const lamp = new SpotLight(0xfff1e0, 0, 0, 0.55, 0.85, 0);
lamp.castShadow = true;
lamp.shadow.mapSize.set(1024, 1024);
lamp.shadow.bias = -0.0004;
lamp.shadow.normalBias = 0.02;
lamp.shadow.camera.near = 3;
lamp.shadow.camera.far = 14;
scene.add(lamp, lamp.target);
const fillLight = new HemisphereLight(0xbfc8ff, 0x000000, 0.12);
scene.add(fillLight);
const LAMP_POWER = 4.2;

// ---------------------------------------------------------------------------
// Desk
// ---------------------------------------------------------------------------

const woodTex = canvasTexture(1024, 1024, (ctx, s) => woodArt(ctx, s));
woodTex.wrapS = woodTex.wrapT = RepeatWrapping;
woodTex.repeat.set(5, 5);
const desk = new Mesh(
  new PlaneGeometry(24, 24).rotateX(-Math.PI / 2),
  new MeshStandardMaterial({ map: woodTex, roughness: 0.72, metalness: 0 }),
);
desk.receiveShadow = true;
scene.add(desk);

// Soft glow that blooms under the book when it opens.
const auraTex = canvasTexture(256, 256, (ctx, s) => {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(253,165,177,0.9)");
  g.addColorStop(0.45, "rgba(150,120,255,0.35)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
});
const aura = new Mesh(
  new PlaneGeometry(5, 5).rotateX(-Math.PI / 2),
  new MeshBasicMaterial({
    map: auraTex,
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
  }),
);
aura.position.y = 0.002;
scene.add(aura);

// ---------------------------------------------------------------------------
// Book
// ---------------------------------------------------------------------------

const book = new Group();
scene.add(book);
const hitTargets = [];
const bookParts = new Set();

const boardMat = new MeshStandardMaterial({ color: 0x141418, roughness: 0.55, metalness: 0.1 });

const backCover = new Mesh(new BoxGeometry(CW, BOARD, CL), boardMat);
backCover.position.set(CW / 2, BOARD / 2, 0);
const spine = new Mesh(new BoxGeometry(0.05, BOARD + LEAVES.length * EPS, CL), boardMat);
spine.position.set(0, (BOARD + LEAVES.length * EPS) / 2, 0);
for (const m of [backCover, spine]) {
  m.castShadow = m.receiveShadow = true;
  book.add(m);
  hitTargets.push(m);
  bookParts.add(m);
}

let mode = "landscape"; // or "portrait"
const faces = [];

function makeFace(name, side, w, l) {
  const c = document.createElement("canvas");
  c.width = TEX_U;
  c.height = TEX_V;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = maxAniso;
  if (side === "back") {
    tex.repeat.x = -1;
    tex.offset.x = 1;
  }
  const mat = new MeshStandardMaterial({
    map: tex,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: 0.22,
    roughness: 0.92,
    metalness: 0,
    side: side === "front" ? FrontSide : BackSide,
  });
  const face = { name, side, canvas: c, tex, mat, links: [], mesh: null, leaf: null };
  faces.push(face);
  return face;
}

function drawFace(face) {
  const ctx = face.canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, TEX_U, TEX_V);
  let lw, lh;
  if (mode === "portrait") {
    // Book is turned 90°: the page reads landscape, so rotate the drawing.
    lw = TEX_V;
    lh = TEX_U;
    ctx.setTransform(0, -1, 1, 0, 0, lw);
  } else {
    lw = TEX_U;
    lh = TEX_V;
  }
  face.links = pages[face.name](ctx, lw, lh) || [];
  face.lw = lw;
  face.lh = lh;
  // Gutter shading next to the spine.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const spineX = face.side === "front" ? 0 : TEX_U;
  const g = ctx.createLinearGradient(
    spineX,
    0,
    face.side === "front" ? TEX_U * 0.1 : TEX_U * 0.9,
    0,
  );
  g.addColorStop(0, "rgba(0,0,0,0.28)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TEX_U, TEX_V);
  face.tex.needsUpdate = true;
}

const leaves = LEAVES.map(([frontName, backName], i) => {
  const front = makeFace(frontName, "front");
  const back = makeFace(backName, "back");
  const leaf = { i, front, back, t: 0, target: 0, delay: 0, dir: 1, dirty: true };
  front.leaf = back.leaf = leaf;

  if (i === 0) {
    // Front cover: a rigid board turning around the spine.
    const pivot = new Group();
    const board = new Mesh(new BoxGeometry(CW, BOARD, CL), boardMat);
    board.position.set(CW / 2, BOARD / 2, 0);
    board.castShadow = board.receiveShadow = true;
    const plane = () =>
      new PlaneGeometry(CW - 0.02, CL - 0.02).rotateX(-Math.PI / 2).translate(CW / 2, 0, 0);
    front.mesh = new Mesh(plane(), front.mat);
    front.mesh.position.y = BOARD + 0.001;
    back.mesh = new Mesh(plane(), back.mat);
    back.mesh.position.y = -0.001;
    pivot.add(board, front.mesh, back.mesh);
    book.add(pivot);
    leaf.pivot = pivot;
    hitTargets.push(board);
    bookParts.add(board);
  } else {
    const geo = new PlaneGeometry(PW, PL, SEG, 1)
      .rotateX(-Math.PI / 2)
      .translate(PW / 2 + 0.01, 0, 0);
    const pos = geo.attributes.position;
    leaf.col = new Uint8Array(pos.count);
    for (let k = 0; k < pos.count; k++) leaf.col[k] = Math.round(((pos.getX(k) - 0.01) / PW) * SEG);
    leaf.geo = geo;
    front.mesh = new Mesh(geo, front.mat);
    back.mesh = new Mesh(geo, back.mat);
    for (const m of [front.mesh, back.mesh]) {
      m.castShadow = true;
      m.receiveShadow = true;
      book.add(m);
    }
  }
  front.mesh.userData.face = front;
  back.mesh.userData.face = back;
  hitTargets.push(front.mesh, back.mesh);
  bookParts.add(front.mesh).add(back.mesh);
  return leaf;
});

const N = LEAVES.length;
const restRight = (i) => BOARD + (N - i) * EPS;
const restLeft = (i) => BOARD + i * EPS;

const px = new Float32Array(SEG + 1);
const py = new Float32Array(SEG + 1);

function poseLeaf(leaf) {
  const e = ease(leaf.t);
  const theta = e * Math.PI;
  if (leaf.pivot) {
    leaf.pivot.rotation.z = theta;
    leaf.pivot.position.y = lerp(restRight(0) + 0.002, BOARD, e);
    return;
  }
  const curl = BEND * Math.sin(Math.PI * leaf.t) * leaf.dir;
  const ds = PW / SEG;
  px[0] = 0;
  py[0] = 0;
  for (let j = 1; j <= SEG; j++) {
    const a = clamp(theta - curl * ((j - 0.5) / SEG), 0, Math.PI);
    px[j] = px[j - 1] + ds * Math.cos(a);
    py[j] = py[j - 1] + ds * Math.sin(a);
  }
  const base = lerp(restRight(leaf.i), restLeft(leaf.i), e);
  const pos = leaf.geo.attributes.position;
  const dx = 0.01 * Math.cos(theta);
  for (let k = 0; k < pos.count; k++) {
    const j = leaf.col[k];
    pos.setX(k, px[j] + dx);
    pos.setY(k, base + py[j]);
  }
  pos.needsUpdate = true;
  leaf.geo.computeVertexNormals();
  leaf.geo.computeBoundingSphere();
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

const props = {};

{
  // Coffee: saucer, cup, latte art, handle, steam.
  const ceramic = new MeshStandardMaterial({ color: 0xf2eee8, roughness: 0.28, metalness: 0 });
  const saucer = new Mesh(
    new LatheGeometry(
      [
        [0, 0],
        [0.3, 0],
        [0.34, 0.028],
        [0.335, 0.034],
        [0.29, 0.014],
        [0, 0.014],
      ].map(([x, y]) => new Vector2(x, y)),
      48,
    ),
    ceramic,
  );
  const cup = new Mesh(
    new LatheGeometry(
      [
        [0, 0.014],
        [0.12, 0.014],
        [0.155, 0.05],
        [0.175, 0.2],
        [0.18, 0.22],
        [0.168, 0.22],
        [0.16, 0.06],
        [0, 0.05],
      ].map(([x, y]) => new Vector2(x, y)),
      48,
    ),
    ceramic,
  );
  cup.material = ceramic.clone();
  cup.material.side = DoubleSide;
  const latte = new Mesh(
    new CircleGeometry(0.166, 40).rotateX(-Math.PI / 2),
    new MeshStandardMaterial({
      map: canvasTexture(256, 256, (ctx, s) => latteArt(ctx, s)),
      roughness: 0.35,
    }),
  );
  latte.position.y = 0.185;
  const handle = new Mesh(new TorusGeometry(0.06, 0.016, 10, 20, Math.PI), ceramic);
  handle.rotation.z = -Math.PI / 2;
  handle.position.set(0.17, 0.13, 0);
  const coffee = new Group();
  coffee.add(saucer, cup, latte, handle);
  coffee.traverse((o) => (o.castShadow = o.receiveShadow = !!o.isMesh));

  const steamMat = new SpriteMaterial({
    map: canvasTexture(128, 128, (ctx, s) => softDot(ctx, s)),
    transparent: true,
    depthWrite: false,
    opacity: 0,
  });
  coffee.userData.steam = Array.from({ length: 5 }, (_, i) => {
    const s = new Sprite(steamMat.clone());
    s.userData.phase = i / 5;
    coffee.add(s);
    return s;
  });
  props.coffee = coffee;
}

{
  // Pen.
  const pen = new Group();
  const black = new MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.25, metalness: 0.6 });
  const silver = new MeshStandardMaterial({ color: 0xc9c9cf, roughness: 0.2, metalness: 1 });
  const body = new Mesh(new CylinderGeometry(0.013, 0.013, 0.78, 16), black);
  const ring = new Mesh(new CylinderGeometry(0.0135, 0.0135, 0.03, 16), silver);
  ring.position.y = 0.2;
  const tip = new Mesh(new ConeGeometry(0.013, 0.07, 16), silver);
  tip.position.y = -0.425;
  tip.rotation.x = Math.PI;
  const clip = new Mesh(new BoxGeometry(0.008, 0.22, 0.008), silver);
  clip.position.set(0.016, 0.26, 0);
  pen.add(body, ring, tip, clip);
  pen.children.forEach((m) => (m.castShadow = true));
  pen.rotation.z = Math.PI / 2;
  const penWrap = new Group();
  pen.position.y = 0.014;
  penWrap.add(pen);
  props.pen = penWrap;
}

{
  // Business card (the NFC card itself). Tapping it jumps to the contact page.
  const card = new Group();
  const base = new Mesh(
    new BoxGeometry(0.57, 0.008, 0.36),
    new MeshStandardMaterial({ color: 0x0d0d0f, roughness: 0.6 }),
  );
  base.position.y = 0.004;
  const top = new Mesh(
    new PlaneGeometry(0.56, 0.35).rotateX(-Math.PI / 2),
    new MeshStandardMaterial({
      map: canvasTexture(1024, 640, (ctx, w, h) => cardArt(ctx, w, h)),
      roughness: 0.55,
      emissive: 0xffffff,
      emissiveIntensity: 0.05,
    }),
  );
  top.material.emissiveMap = top.material.map;
  top.position.y = 0.0085;
  card.add(base, top);
  base.castShadow = true;
  card.userData.isCard = true;
  base.userData.card = top.userData.card = true;
  hitTargets.push(base, top);
  props.card = card;
}

{
  // Small tin.
  const tin = new Group();
  const metal = new MeshStandardMaterial({ color: 0x5d6b6a, roughness: 0.35, metalness: 0.8 });
  const body = new Mesh(new CylinderGeometry(0.17, 0.17, 0.08, 40), metal);
  body.position.y = 0.04;
  const lid = new Mesh(
    new CylinderGeometry(0.175, 0.175, 0.02, 40),
    new MeshStandardMaterial({ color: 0x8fa3a0, roughness: 0.3, metalness: 0.9 }),
  );
  lid.position.y = 0.085;
  tin.add(body, lid);
  tin.children.forEach((m) => (m.castShadow = true));
  props.tin = tin;
}

Object.values(props).forEach((p) => scene.add(p));

// Prop placement and camera boxes per orientation. Boxes are [minX, maxX, minZ, maxZ].
const LAYOUT = {
  landscape: {
    book: 0,
    props: {
      coffee: [2.5, -0.5, 0],
      tin: [-2.0, -0.6, 0],
      pen: [-2.0, 0.55, 0.45],
      card: [2.45, 0.75, -0.3],
    },
    overview: [-2.5, 3.0, -1.3, 1.3],
    open: [-CW, CW, -CL / 2, CL / 2],
    lamp: [0.8, 7, 1.6],
    aura: [0, 0],
  },
  portrait: {
    book: -Math.PI / 2,
    props: {
      coffee: [0.6, -1.95, 0],
      tin: [-0.62, -1.85, 0],
      pen: [-0.55, 2.1, -0.35],
      card: [0.55, 2.05, 0.2],
    },
    overview: [-1.25, 1.25, -3.3, 2.45],
    open: [-CL / 2, CL / 2, -CW, CW],
    lamp: [0.4, 7.5, 1.4],
    aura: [0, 0],
  },
};

function applyMode(next) {
  mode = next;
  const L = LAYOUT[mode];
  book.rotation.y = L.book;
  for (const [name, [x, z, ry]] of Object.entries(L.props)) {
    props[name].position.set(x, 0, z);
    props[name].rotation.y = ry;
  }
  lamp.position.set(...L.lamp);
  faces.forEach(drawFace);
  document.body.dataset.mode = mode;
}

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

const camGoal = { pos: new Vector3(), look: new Vector3() };
const camLook = new Vector3();
const parallax = new Vector2();

function frameBox([minX, maxX, minZ, maxZ], tiltDeg, margin) {
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const w = maxX - minX;
  const h = maxZ - minZ;
  const tan = Math.tan((camera.fov * Math.PI) / 360);
  const tilt = (tiltDeg * Math.PI) / 180;
  const dist = Math.max(((h / 2) * Math.cos(tilt)) / tan, w / 2 / (tan * camera.aspect)) * margin;
  camGoal.look.set(cx, 0, cz);
  camGoal.pos.set(cx, dist * Math.cos(tilt), cz + dist * Math.sin(tilt));
}

function frameForState() {
  const L = LAYOUT[mode];
  if (spread === 0) {
    frameBox(L.overview, mode === "portrait" ? 22 : 30, 1.04);
    lamp.target.position.set(mode === "portrait" ? 0 : 0.7, 0, mode === "portrait" ? 0.7 : 0);
  } else {
    frameBox(L.open, mode === "portrait" ? 6 : 14, mode === "portrait" ? 1.06 : 1.22);
    lamp.target.position.set(0, 0, 0);
  }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let spread = 0;
let introT = 0;

function goTo(n) {
  n = clamp(n, 0, MAX_SPREAD);
  if (n === spread) return;
  const forward = n > spread;
  const changing = leaves.filter((l) => (l.i < n ? 1 : 0) !== l.target);
  if (!forward) changing.reverse();
  changing.forEach((l, k) => {
    l.target = l.i < n ? 1 : 0;
    l.dir = forward ? 1 : -1;
    l.delay = reducedMotion ? 0 : k * 0.11;
  });
  spread = n;
  frameForState();
  syncUI();
}

function syncUI() {
  document.body.classList.toggle("is-open", spread > 0);
  ui.label.textContent = spread > 0 ? `${SPREAD_LABELS[spread]} · ${spread}/${MAX_SPREAD}` : "";
  ui.prev.disabled = spread <= 1;
  ui.next.disabled = spread >= MAX_SPREAD;
  if (spread > 0) history.replaceState(null, "", "#" + spreadSlug[spread]);
  else history.replaceState(null, "", location.pathname + location.search);
}

const spreadSlug = Object.fromEntries(Object.entries(SPREAD).map(([k, v]) => [v, k]));

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

const raycaster = new Raycaster();
const ndc = new Vector2();
let down = null;

function pick(clientX, clientY) {
  ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  return raycaster.intersectObjects(hitTargets, false)[0] || null;
}

function openLink(href) {
  if (/^(mailto|tel):/.test(href)) location.href = href;
  else window.open(href, "_blank", "noopener");
}

function handleTap(clientX, clientY) {
  const hit = pick(clientX, clientY);
  if (!hit) {
    if (spread > 0) {
      const after = mode === "portrait" ? clientY > innerHeight / 2 : clientX > innerWidth / 2;
      goTo(spread + (after ? 1 : -1));
    }
    return;
  }
  const obj = hit.object;
  if (obj.userData.card) return goTo(SPREAD.contact);
  const face = obj.userData.face;
  if (face && hit.uv && spread > 0) {
    const cx = (face.side === "front" ? hit.uv.x : 1 - hit.uv.x) * TEX_U;
    const cy = (1 - hit.uv.y) * TEX_V;
    const X = mode === "portrait" ? face.lw - cy : cx;
    const Y = mode === "portrait" ? cx : cy;
    const link = face.links.find((r) => X >= r.x && X <= r.x + r.w && Y >= r.y && Y <= r.y + r.h);
    if (link) return link.href ? openLink(link.href) : goTo(link.spread);
    return goTo(spread + (face.side === "front" ? 1 : -1));
  }
  if (bookParts.has(obj) && spread === 0) goTo(1);
}

canvasEl.addEventListener("pointerdown", (e) => {
  down = { x: e.clientX, y: e.clientY, t: performance.now() };
});
canvasEl.addEventListener("pointerup", (e) => {
  if (!down) return;
  const dx = e.clientX - down.x;
  const dy = e.clientY - down.y;
  const quick = performance.now() - down.t < 700;
  down = null;
  const dist = Math.hypot(dx, dy);
  if (dist > 40 && quick && spread > 0) {
    const vertical = mode === "portrait" && Math.abs(dy) > Math.abs(dx);
    const d = vertical ? dy : dx;
    goTo(spread + (d < 0 ? 1 : -1));
  } else if (dist > 40 && quick && spread === 0) {
    goTo(1);
  } else if (dist < 12) {
    handleTap(e.clientX, e.clientY);
  }
});
canvasEl.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse") return;
  parallax.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
  const hit = pick(e.clientX, e.clientY);
  let pointer = false;
  if (hit) {
    const face = hit.object.userData.face;
    if (hit.object.userData.card || (spread === 0 && bookParts.has(hit.object))) pointer = true;
    else if (face && spread > 0) pointer = true;
  }
  canvasEl.style.cursor = pointer ? "pointer" : "default";
  hoverBook = spread === 0 && !!hit && bookParts.has(hit.object);
});
let hoverBook = false;

addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
    e.preventDefault();
    goTo(Math.max(spread + 1, 1));
  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    goTo(spread - 1);
  } else if (e.key === "Escape") goTo(0);
});
ui.prev.addEventListener("click", () => goTo(Math.max(1, spread - 1)));
ui.next.addEventListener("click", () => goTo(spread + 1));
ui.close.addEventListener("click", () => goTo(0));
document.querySelectorAll("[data-spread]").forEach((el) =>
  el.addEventListener("click", (e) => {
    e.preventDefault();
    goTo(Number(el.dataset.spread));
  }),
);

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const next = camera.aspect < 0.85 ? "portrait" : "landscape";
  if (next !== mode || !faces[0].lw) applyMode(next);
  frameForState();
}
addEventListener("resize", resize);

let last = performance.now();
let firstFrame = true;

function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  // Lamp switching on: a short flicker, then a steady glow.
  introT += dt;
  let power = 1;
  if (!reducedMotion && introT < 1.3) {
    const flick =
      introT < 0.15
        ? 0
        : introT < 0.22
          ? 0.7
          : introT < 0.34
            ? 0.1
            : introT < 0.42
              ? 0.9
              : introT < 0.5
                ? 0.3
                : 1;
    power = flick * Math.min(1, introT / 1.3 + 0.3);
  }
  lamp.intensity = LAMP_POWER * power;

  for (const leaf of leaves) {
    if (leaf.delay > 0) {
      leaf.delay -= dt;
      continue;
    }
    if (leaf.t !== leaf.target) {
      const step = dt / FLIP_TIME;
      leaf.t =
        leaf.target > leaf.t
          ? Math.min(leaf.target, leaf.t + step)
          : Math.max(leaf.target, leaf.t - step);
      leaf.dirty = true;
    }
    if (leaf.dirty) {
      poseLeaf(leaf);
      leaf.dirty = false;
    }
  }

  book.position.y = damp(book.position.y, hoverBook ? 0.04 : 0, 10, dt);
  aura.material.opacity = damp(aura.material.opacity, spread > 0 ? 0.28 : 0.08 * power, 3, dt);

  for (const s of props.coffee.userData.steam) {
    const p = (now / 4200 + s.userData.phase) % 1;
    s.position.set(
      Math.sin(p * 6 + s.userData.phase * 9) * 0.04,
      0.24 + p * 0.55,
      Math.cos(p * 5) * 0.02,
    );
    s.scale.setScalar(0.12 + p * 0.35);
    s.material.opacity = Math.sin(p * Math.PI) * 0.07 * power;
  }

  const k = reducedMotion ? 20 : 3.2;
  const goal = camGoal.pos;
  const par = spread === 0 ? 0.18 : 0.06;
  camera.position.x = damp(camera.position.x, goal.x + parallax.x * par, k, dt);
  camera.position.y = damp(camera.position.y, goal.y, k, dt);
  camera.position.z = damp(camera.position.z, goal.z + parallax.y * par, k, dt);
  camLook.x = damp(camLook.x, camGoal.look.x, k, dt);
  camLook.y = damp(camLook.y, camGoal.look.y, k, dt);
  camLook.z = damp(camLook.z, camGoal.look.z, k, dt);
  camera.lookAt(camLook);

  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    document.body.classList.add("ready");
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function boot() {
  resize();
  // Start the camera a little higher so it settles in.
  camera.position.copy(camGoal.pos).multiplyScalar(1.25);
  camLook.copy(camGoal.look);
  renderer.setAnimationLoop(tick);

  // Page text needs the web fonts; redraw once they are in.
  const fontsReady = Promise.all(
    [
      '400 40px "Instrument Serif"',
      'italic 400 40px "Instrument Serif"',
      '400 40px "Inter"',
      '500 40px "Inter"',
      '600 40px "Inter"',
    ].map((f) => document.fonts.load(f)),
  ).catch(() => {});
  await Promise.race([fontsReady, new Promise((r) => setTimeout(r, 3000))]);
  faces.forEach(drawFace);

  const fromHash = SPREAD[location.hash.slice(1)];
  if (fromHash) setTimeout(() => goTo(fromHash), reducedMotion ? 0 : 900);
}

syncUI();
boot();

// Hook for automated screenshots.
window.__desk = { goTo, settled: () => leaves.every((l) => l.t === l.target) };
