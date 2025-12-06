let layers = [];   // holds ANY number of layers

function preload() {
  // load your models
  let person = loadModel("/assets/person.obj", true);
  let unity  = loadModel("/assets/unity.obj", true);
  let communication = loadModel("/assets/communication.obj", true);
  let movement = loadModel("/assets/movement.obj", true);
  let life = loadModel("/assets/life.obj", true);
  let axis = loadModel("/assets/axis.obj", true);
  let center= loadModel("/assets/center.obj", true);
  let gravity= loadModel("/assets/gravity.obj", true);
  let distance = loadModel("/assets/distance.obj", true);
  let feeling = loadModel("/assets/feeling.obj", true);
  let connection = loadModel("/assets/connection.obj", true);

  layers = [
    {
      model: person,
      count: 8,
      scale: 1.0,
      rotationOffsetX: random(TWO_PI),
      rotationOffsetY: random(TWO_PI),
      rotationOffsetZ: random(TWO_PI),
    },
    {
      model: distance,
      count: 20,
      scale: 0.6,
      rotationOffsetX: random(TWO_PI),
      rotationOffsetY: random(TWO_PI),
      rotationOffsetZ: random(TWO_PI),
    },
    {
      model: center,
      count: 8,
      scale: 0.5,
      rotationOffsetX: random(TWO_PI),
      rotationOffsetY: random(TWO_PI),
      rotationOffsetZ: random(TWO_PI),
    },
  ];
}

let container1;

function setup() {
  container1 = document.getElementById("left-sketch"); // or right-sketch, bottom-row
  let w = container1.offsetWidth;
  let h = container1.offsetHeight;

  let c = createCanvas(w, h);
  c.parent(container1);

  computeLayerDistances();
}

function windowResized() {
  let w = container1.offsetWidth;
  let h = container1.offsetHeight;
  resizeCanvas(w, h);
}

function draw() {
  background(200);
  orbitControl();

  rotateY(frameCount * 0.003);
  rotateZ(frameCount*0.003);

  //normalMaterial();

  for (let L of layers) {
    push();
    rotateY(L.rotationOffsetY);
    rotateX(L.rotationOffsetX);
    rotateZ(L.rotationOffsetZ);
    drawLayer(L.model, L.count, L.distance,L.scale);
    pop();
  }
}


function computeLayerDistances() {
  const compression = 0.9; 

  for (let i = 0; i < layers.length; i++) {
    let L = layers[i];

    L.radius = computeModelRadius(L.model) * L.scale;

    if (i === 0) {
      L.distance = L.radius;
    } else {
      let prev = layers[i - 1];
      L.distance = prev.distance + (prev.radius + L.radius) * compression;
    }
  }
}


function drawLayer(modelRef, copies, radius, layerScale) {
  for (let i = 0; i < copies; i++) {
    push();

    let phi   = acos(1 - 2 * (i + 0.5) / copies);
    let theta = PI * (1 + Math.sqrt(5)) * i;

    let x = radius * sin(phi) * cos(theta);
    let y = radius * sin(phi) * sin(theta);
    let z = radius * cos(phi);

    translate(x, y, z);

    // orient outward
    let dir   = createVector(x, y, z).normalize();
    let up    = createVector(0, 1, 0);
    let axis  = up.cross(dir);
    let angle = acos(up.dot(dir));
    rotate(angle, axis);

    scale(layerScale);

    model(modelRef);

    pop();
  }
}


function computeModelRadius(modelObj) {
  let minX =  Infinity, minY =  Infinity, minZ =  Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let v of modelObj.vertices) {
    minX = min(minX, v.x);
    minY = min(minY, v.y);
    minZ = min(minZ, v.z);

    maxX = max(maxX, v.x);
    maxY = max(maxY, v.y);
    maxZ = max(maxZ, v.z);
  }

  return max(maxX - minX, maxY - minY, maxZ - minZ) * 0.5;
}

