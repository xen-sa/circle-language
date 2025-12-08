let leftSketch = (p) => {

  let layers = [];
  let container1;
  let modelMap = {}; // map translation to model
  let mouseOverCanvas = false;
  
  // model definitions with their counts based on option
  const modelDefs = {
    subject: { count: 8 },
    object: { count: 13 },
    adverb: { count: 21 },
    verb: { count: 34 }
  };

  // hard-coded scales for each model
  const modelScales = {
    "person": 1.0,
    "unity": 0.5,
    "communication": 0.7,
    "movement": 1.0,
    "life": 1.3,
    "axis": 0.8,
    "center": 0.7,
    "gravity": 1.0,
    "distance": 0.5,
    "feeling": 0.85,
    "connection": 0.6
  };

  // ---------------------------
  // PRELOAD
  // ---------------------------
  p.preload = () => {
    let person        = p.loadModel("assets/models/person.obj", true);
    let unity         = p.loadModel("assets/models/unity.obj", true);
    let communication = p.loadModel("assets/models/communication.obj", true);
    let movement      = p.loadModel("assets/models/movement.obj", true);
    let life          = p.loadModel("assets/models/life.obj", true);
    let axis          = p.loadModel("assets/models/axis.obj", true);
    let center        = p.loadModel("assets/models/center.obj", true);
    let gravity       = p.loadModel("assets/models/gravity.obj", true);
    let distance      = p.loadModel("assets/models/distance.obj", true);
    let feeling       = p.loadModel("assets/models/feeling.obj", true);
    let connection    = p.loadModel("assets/models/connection.obj", true);

    // map translations to models (add more as needed)
    modelMap = {
      "person": person,
      "unity": unity,
      "communication": communication,
      "movement": movement,
      "life": life,
      "axis": axis,
      "center": center,
      "gravity": gravity,
      "distance": distance,
      "feeling": feeling,
      "connection": connection
    };

    layers = [];
  };

  // ---------------------------
  // SETUP
  // ---------------------------
  p.setup = () => {
    container1 = document.getElementById("left-sketch");
    p.pixelDensity(1.3);

    let w = container1.offsetWidth;
    let h = container1.offsetHeight;

    let c = p.createCanvas(w, h, p.WEBGL);
    c.parent(container1);

    // track when mouse is over the container so orbitControl only runs then
    container1.addEventListener('mouseenter', () => { mouseOverCanvas = true; });
    container1.addEventListener('mouseleave', () => { mouseOverCanvas = false; });

    computeLayerDistances();
    
    // set up global listeners for word events
    window.onWordSelected = (wordData) => {
      addLayerFromWord(wordData);
    };
    
    window.onWordRemoved = (word) => {
      removeLayerByWord(word);
    };
    
    window.onOptionChanged = (wordData) => {
      updateLayerCount(wordData);
    };
  };

  // ---------------------------
  // RESIZE
  // ---------------------------
  p.windowResized = () => {
    let w = container1.offsetWidth;
    let h = container1.offsetHeight;
    p.resizeCanvas(w, h);
  };

  // ---------------------------
  // DRAW
  // ---------------------------
  p.draw = () => {
    p.background(100);
    // only enable orbit controls when the mouse is over this sketch's container
    if (mouseOverCanvas) {
      p.orbitControl();
    }

    p.rotateY(p.frameCount * 0.003);
    p.rotateZ(p.frameCount * 0.003);

    for (let L of layers) {
      p.push();
      p.rotateY(L.rotationOffsetY);
      p.rotateX(L.rotationOffsetX);
      p.rotateZ(L.rotationOffsetZ);
      drawLayer(L.model, L.count, L.distance, L.scale);
      p.pop();
    }
  };

  // ---------------------------
  // FUNCTIONS (instance-mode)
  // ---------------------------

  function addLayerFromWord(wordData) {
    // wordData contains: { translation, word, options: { subject, object, verb, adverb } }
    let translation = wordData.translation;
    let selectedOptions = wordData.options || {};
    
    // determine count based on selected option
    let count = 8; // default
    if (selectedOptions.subject) count = modelDefs.subject.count;
    else if (selectedOptions.object) count = modelDefs.object.count;
    else if (selectedOptions.adverb) count = modelDefs.adverb.count;
    else if (selectedOptions.verb) count = modelDefs.verb.count;
    
    // get model from map (use translation directly as key)
    let model = modelMap[translation];
    if (!model) {
      let modelKeys = Object.keys(modelMap);
      model = modelMap[modelKeys[0]];
    }
    
    if (!model) return; // safety check
    
    // get scale from modelScales map, default to 1.0 if not found
    let scale = modelScales[translation] || 1.0;
    
    // create new layer object
    let newLayer = {
      model: model,
      count: count,
      scale: scale,
      rotationOffsetX: p.random(p.TWO_PI),
      rotationOffsetY: p.random(p.TWO_PI),
      rotationOffsetZ: p.random(p.TWO_PI),
      translation: translation,
      word: wordData.word
    };
    
    layers.push(newLayer);
    computeLayerDistances();
  }

  function removeLayerByWord(word) {
    // remove layer matching the word
    layers = layers.filter(l => l.word !== word);
    computeLayerDistances();
  }

  function updateLayerCount(wordData) {
    // find and update layer for this word
    for (let L of layers) {
      if (L.word === wordData.word) {
        let selectedOptions = wordData.options || {};
        let count = 8; // default
        if (selectedOptions.subject) count = modelDefs.subject.count;
        else if (selectedOptions.object) count = modelDefs.object.count;
        else if (selectedOptions.adverb) count = modelDefs.adverb.count;
        else if (selectedOptions.verb) count = modelDefs.verb.count;
        L.count = count;
        computeLayerDistances();
        return;
      }
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
      p.push();

      let phi   = p.acos(1 - 2 * (i + 0.5) / copies);
      let theta = p.PI * (1 + Math.sqrt(5)) * i;

      let x = radius * p.sin(phi) * p.cos(theta);
      let y = radius * p.sin(phi) * p.sin(theta);
      let z = radius * p.cos(phi);

      p.translate(x, y, z);

      // face outward
      let dir   = p.createVector(x, y, z).normalize();
      let up    = p.createVector(0, 1, 0);
      let axis  = up.cross(dir);
      let angle = p.acos(up.dot(dir));
      p.rotate(angle, axis);

      p.scale(layerScale);
      p.model(modelRef);

      p.pop();
    }
  }

  function computeModelRadius(modelObj) {
    let minX =  Infinity, minY =  Infinity, minZ =  Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let v of modelObj.vertices) {
      minX = p.min(minX, v.x);
      minY = p.min(minY, v.y);
      minZ = p.min(minZ, v.z);

      maxX = p.max(maxX, v.x);
      maxY = p.max(maxY, v.y);
      maxZ = p.max(maxZ, v.z);
    }

    return p.max(maxX - minX, maxY - minY, maxZ - minZ) * 0.5;
  }

};

new p5(leftSketch);