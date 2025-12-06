let rightSketch = (p) => {
    let container;
    let vt323;

    let wordStrings = [];
    let words = [];
    let info;
    let sentence = []; // ordered list of words selected to form the sentence
    let currentSelectedWord = null; // last clicked word for showing options
    const MIN_DIST = 50; // minimum placement distance between words
    const SENTENCE_SPACING = 12; // pixels between words in the sentence

  p.preload = () => {
    info = p.loadTable("/assets/etc/vocabulary.csv", "csv", "header");
    vt323 = p.loadFont("/assets/etc/VT323-Regular.ttf");
  }
  
  p.setup = () => {
    container = document.getElementById("right-sketch");
    let w = container.offsetWidth;
    let h = container.offsetHeight;
    let c = p.createCanvas(w, h);
    c.parent(container);

    p.textSize(18);
    p.textFont(vt323);
    p.textAlign(p.LEFT, p.BASELINE);

    wordStrings=info.getColumn("word");

    placeWords();
  };

  p.draw = () => {
    p.background(0);
    // draw non-sentence words first
    for (let w of words) {
      w.update();
    }

    // handle avoidance where sentence words move through others
    handleAvoidance();

    // separate any overlapping words
    separateWords();

    // display non-sentence first, then sentence so sentence is on top
    for (let w of words) {
      if (!w.inSentence) w.display();
    }
    for (let w of sentence) w.display();

    // draw options under the currently selected word
    if (currentSelectedWord) {
      drawOptionsForWord(currentSelectedWord);
    }

    // draw options under each sentence word
    for (let w of sentence) {
      drawOptionsForWord(w);
    }
  };

  p.mousePressed = () => {
    // only respond if mouse inside canvas
    if (p.mouseX < 0 || p.mouseY < 0 || p.mouseX > p.width || p.mouseY > p.height) return;

    // first, try to click an option on the currently selected word
    if (currentSelectedWord) {
      let optLabel = optionHit(p.mouseX, p.mouseY, currentSelectedWord);
      if (optLabel) {
        if (!currentSelectedWord.options) currentSelectedWord.options = {};
        currentSelectedWord.options[optLabel] = !currentSelectedWord.options[optLabel];
        
        // notify 3d_sketch of option change
        if (window.onOptionChanged && currentSelectedWord.inSentence) {
          window.onOptionChanged({
            word: currentSelectedWord.text,
            translation: currentSelectedWord.translation || currentSelectedWord.text,
            options: currentSelectedWord.options
          });
        }
        return;
      }
    }

    // also try to click an option on any sentence word
    for (let s of sentence) {
      let optLabel = optionHit(p.mouseX, p.mouseY, s);
      if (optLabel) {
        if (!s.options) s.options = {};
        s.options[optLabel] = !s.options[optLabel];
        
        // notify 3d_sketch of option change
        if (window.onOptionChanged) {
          window.onOptionChanged({
            word: s.text,
            translation: s.translation || s.text,
            options: s.options
          });
        }
        return;
      }
    }

    // check topmost words first (sentence words drawn last are on top)
    // iterate reverse so last drawn (sentence) get priority
    let foundWord = false;
    for (let i = words.length - 1; i >= 0; i--) {
      let w = words[i];
      if (w.contains(p.mouseX, p.mouseY)) {
        // set this as current selected for option display
        currentSelectedWord = w;
        toggleWordInSentence(w);
        foundWord = true;
        break;
      }
    }
    // if no word clicked, deselect current word and reset its options
    if (!foundWord) {
      if (currentSelectedWord) {
        currentSelectedWord.options = {};
      }
      currentSelectedWord = null;
    }
  };

  p.windowResized = () => {
    let w = container.offsetWidth;
    let h = container.offsetHeight;
    p.resizeCanvas(w, h);
    // keep words roughly in place relative to canvas: if canvas resizes, don't drastically move
    // we'll recompute sentence targets so the sentence stays centered
    updateSentenceTargets();
  };

  // --- helpers and classes ---
  function placeWords() {
    words = [];
    let w = p.width;
    let h = p.height;

    wordStrings.forEach(word => {
        let attempts = 0;
        let placed = false;
        let x, y;
        while (!placed && attempts < 2000) {
        x = p.random(40, w - 40);
        y = p.random(40, h - 40);
        placed = true;
        for (let other of words) {
          let d = p.dist(x, y, other.baseX, other.baseY);
          if (d < MIN_DIST) {
            placed = false;
            break;
          }
        }
        attempts++;
      }
      // attach flags from CSV if available
      let flags = { subject: false, object: false, verb: false, adverb: false };
      if (info) {
        let row = info.findRow ? info.findRow(word, 'word') : null;
        if (!row) {
          // try matching by lowercase
          for (let r = 0; r < info.getRowCount(); r++) {
            try {
              if (info.getString(r, 'word').toLowerCase() === String(word).toLowerCase()) {
                row = info.getRow(r);
                break;
              }
            } catch (e) {}
          }
        }
        if (row) {
          try {
            flags.subject = String(row.get('subject') || '').toLowerCase() === 'true';
            flags.object = String(row.get('object') || '').toLowerCase() === 'true';
            flags.verb = String(row.get('verb') || '').toLowerCase() === 'true';
            flags.adverb = String(row.get('adverb') || '').toLowerCase() === 'true';
          } catch (e) {}
        }
      }
      let ww = new Word(word, x, y, flags);
      // mark words that originally landed in the central area as center-candidates
      let cxMin = p.width * 0.35;
      let cxMax = p.width * 0.65;
      let cyMin = p.height * 0.35;
      let cyMax = p.height * 0.65;
      ww.isCenterCandidate = (x >= cxMin && x <= cxMax && y >= cyMin && y <= cyMax);
      ww.origBaseX = x;
      ww.origBaseY = y;
      words.push(ww);
    });

  }

  // push overlapping words apart (transiently, doesn't change base positions)
  function separateWords() {
    // simple pairwise separation
    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j < words.length; j++) {
        let a = words[i];
        let b = words[j];
        // compute bounding boxes
        let aw = p.textWidth(a.text);
        let ah = p.textAscent() + p.textDescent();
        let bw = p.textWidth(b.text);
        let bh = p.textAscent() + p.textDescent();
        let ax = a.currentX;
        let ay = a.currentY - p.textAscent()/2;
        let bx = b.currentX;
        let by = b.currentY - p.textAscent()/2;

        // overlap test (approximate with center distances)
        let dx = bx - ax;
        let dy = by - ay;
        let overlapX = (aw + bw) / 2 - Math.abs(dx);
        let overlapY = (ah + bh) / 2 - Math.abs(dy);
        if (overlapX > 0 && overlapY > 0) {
          // push them apart along the axis of greater overlap
          if (overlapX > overlapY) {
            let push = overlapX * 0.5 + 0.5;
            let sign = dx >= 0 ? 1 : -1;
            // only move non-sentence words (sentence words stay on path)
            if (!a.inSentence) a.currentX -= sign * push;
            if (!b.inSentence) b.currentX += sign * push;
          } else {
            let push = overlapY * 0.5 + 0.5;
            let sign = dy >= 0 ? 1 : -1;
            if (!a.inSentence) a.currentY -= sign * push;
            if (!b.inSentence) b.currentY += sign * push;
          }
        }
      }
    }
  }

  // when a sentence word moves, temporarily nudge overlapping words away
  function handleAvoidance() {
    for (let s of sentence) {
      for (let other of words) {
        if (other === s) continue;
        if (other.inSentence) continue;
        // bounding boxes
        let sw = p.textWidth(s.text);
        let sh = p.textAscent() + p.textDescent();
        let ow = p.textWidth(other.text);
        let oh = p.textAscent() + p.textDescent();
        let sx = s.currentX;
        let sy = s.currentY - p.textAscent()/2;
        let ox = other.currentX;
        let oy = other.currentY - p.textAscent()/2;

        let dx = ox - sx;
        let dy = oy - sy;
        let overlapX = (sw + ow) / 2 - Math.abs(dx);
        let overlapY = (sh + oh) / 2 - Math.abs(dy);
        if (overlapX > 0 && overlapY > 0) {
          // compute push vector away from s
          let mag = Math.sqrt(dx * dx + dy * dy) || 0.001;
          let ux = dx / mag;
          let uy = dy / mag;
          // set temporary avoid offset on other
          other.avoidDX = (other.avoidDX || 0) + ux * 30;
          other.avoidDY = (other.avoidDY || 0) + uy * 30;
          other.avoidTimer = 60; // frames to keep avoiding
        }
      }
    }
  }

  // find a free position that's at least MIN_DIST from other words' base positions
  function findFreePosition(options = {}) {
    // options: avoidCenter (bool), margin (number)
    const avoidCenter = options.avoidCenter === undefined ? true : options.avoidCenter;
    const margin = options.margin || MIN_DIST;
    let attempts = 0;
    while (attempts < 2000) {
      let x = p.random(40, p.width - 40);
      let y = p.random(40, p.height - 40);
      let ok = true;
      for (let other of words) {
        // check against other current positions to avoid glitches
        let otherX = other.currentX || other.baseX;
        let otherY = other.currentY || other.baseY;
        if (p.dist(x, y, otherX, otherY) < margin) {
          ok = false;
          break;
        }
      }
      // optionally avoid the center sentence area
      if (ok && avoidCenter) {
        let cxMin = p.width * 0.30;
        let cxMax = p.width * 0.70;
        let cyMin = p.height * 0.30;
        let cyMax = p.height * 0.70;
        if (x >= cxMin && x <= cxMax && y >= cyMin && y <= cyMax) ok = false;
      }
      if (ok) return { x, y };
      attempts++;
    }
    // fallback
    return { x: p.random(40, p.width - 40), y: p.random(40, p.height - 40) };
  }

  function ejectWordToNewPlace(w) {
    // remove from sentence and move to a new base position
    w.inSentence = false;
    // find a free position away from center and from others
    let pos = findFreePosition({ avoidCenter: true, margin: MIN_DIST });
    w.baseX = pos.x;
    w.baseY = pos.y;
    // set targets so it animates to the new place
    w.targetX = pos.x;
    w.targetY = pos.y;
    // give a little push so movement is visible
    w.avoidDX = (p.random() - 0.5) * 40;
    w.avoidDY = (p.random() - 0.5) * 40;
    w.avoidTimer = 40;
  }

  // draw options for a word; positioned below the word text
  function drawOptionsForWord(word) {
    if (!word) return;
    const labels = ['subject', 'object', 'verb', 'adverb'];
    const gap = 5; // horizontal gap between options
    let totalW = labels.reduce((sum, lab) => sum + p.textWidth(lab) + gap, 0) - gap;
    let startX = word.currentX + p.textWidth(word.text) / 2 - totalW / 2; // center under word
    let y = word.currentY + 15; // below the word
    let x = startX;
    for (let lab of labels) {
      let available = word.flags ? word.flags[lab] : false;
      if (!available) {
        x += p.textWidth(lab) + gap;
        continue;
      }
      // text only, no circle
      p.push();
      let selected = word.options && word.options[lab];
      p.fill(selected ? '#00ff11ff' : '#8888FF');
      p.textAlign(p.LEFT, p.BASELINE);
      p.text(lab, x, y);
      p.pop();
      x += p.textWidth(lab) + gap;
    }
  }

  // option hit test: check if click is on an option near a word
  function optionHit(mx, my, word) {
    if (!word) return null;
    const labels = ['subject', 'object', 'verb', 'adverb'];
    const optSize = 12;
    const gap = 8;
    let totalW = labels.reduce((sum, lab) => sum + p.textWidth(lab) + gap, 0) - gap;
    let startX = word.currentX + p.textWidth(word.text) / 2 - totalW / 2;
    let y = word.currentY + 15;
    let x = startX;
    for (let lab of labels) {
      let available = word.flags ? word.flags[lab] : false;
      if (!available) {
        x += p.textWidth(lab) + gap;
        continue;
      }
      let w = p.textWidth(lab);
      let h = p.textSize();
      if (mx >= x && mx <= x + w && my >= y - h && my <= y) {
        return lab; // return the label name
      }
      x += w + gap;
    }
    return null;
  }

  function toggleWordInSentence(word) {
    if (!word.inSentence) {
      // eject words that originally appeared in the central region so the sentence can occupy center
      for (let w of words) {
        if (w !== word && w.isCenterCandidate && !w.inSentence) {
          // only eject if it's currently near the center area to avoid unnecessary moves
          let cx = p.width / 2;
          let cy = p.height / 2;
          if (p.dist(w.currentX, w.currentY, cx, cy) < Math.max(p.width, p.height) * 0.25) {
            ejectWordToNewPlace(w);
          }
        }
      }
      // add clicked word to sentence
      sentence.push(word);
      word.inSentence = true;
      
      // check if word has only one available option, and auto-select it
      if (word.flags) {
        let availableOptions = [];
        if (word.flags.subject) availableOptions.push('subject');
        if (word.flags.object) availableOptions.push('object');
        if (word.flags.verb) availableOptions.push('verb');
        if (word.flags.adverb) availableOptions.push('adverb');
        
        if (availableOptions.length === 1) {
          // auto-select the only available option
          if (!word.options) word.options = {};
          word.options[availableOptions[0]] = true;
        }
      }
      
      // notify 3d_sketch of word selection
      if (window.onWordSelected) {
        window.onWordSelected({
          word: word.text,
          translation: word.translation || word.text,
          options: word.options || {}
        });
      }
    } else {
      // remove from sentence and return to its original base (if available) or current base
      let idx = sentence.indexOf(word);
      if (idx !== -1) sentence.splice(idx, 1);
      word.inSentence = false;
      
      // notify 3d_sketch that word was removed
      if (window.onWordRemoved) {
        window.onWordRemoved(word.text);
      }
      

      if (word.origBaseX !== undefined) {
        // return to original base
        word.baseX = word.origBaseX;
        word.baseY = word.origBaseY;
      }
      word.targetX = word.baseX;
      word.targetY = word.baseY;
    }
    updateSentenceTargets();
  }

  function updateSentenceTargets() {
    if (sentence.length === 0) {
      // nothing selected: return all to base
      for (let w of words) {
        // if word was an original center candidate, restore its original base
        if (w.isCenterCandidate && w.origBaseX !== undefined) {
          w.baseX = w.origBaseX;
          w.baseY = w.origBaseY;
        }
        w.targetX = w.baseX;
        w.targetY = w.baseY;
      }
      return;
    }

    // compute widths
    let widths = sentence.map(s => p.textWidth(s.text));
    let totalW = widths.reduce((a, b) => a + b, 0) + SENTENCE_SPACING * (sentence.length - 1);
    let startX = (p.width - totalW) / 2;
    let centerY = p.height / 2;
    let x = startX;
    for (let i = 0; i < sentence.length; i++) {
      let s = sentence[i];
      s.targetX = x;
      s.targetY = centerY;
      x += widths[i] + SENTENCE_SPACING;
    }
  }

  class Word {
    constructor(text, x, y, flags = { subject:false, object:false, verb:false, adverb:false }) {
      this.text = text;
      this.baseX = x;
      this.baseY = y;
      this.currentX = x;
      this.currentY = y;
      this.targetX = x;
      this.targetY = y;
      this.inSentence = false;
      this.phase = p.random(1000);
      this.amp = p.random(6, 18);
      this.speed = p.random(0.002, 0.01);
      this.tint = 255;
      this.avoidDX = 0;
      this.avoidDY = 0;
      this.avoidTimer = 0;
      this.flags = flags;
      // per-word option selection state
      this.options = { subject:false, object:false, verb:false, adverb:false };
    }

    update() {
      if (this.inSentence) {
        // animate toward target (smoother)
        this.currentX = p.lerp(this.currentX, this.targetX, 0.18);
        this.currentY = p.lerp(this.currentY, this.targetY, 0.18);
      } else {
        // float around base using Perlin noise
        let t = p.millis();
        let ox = (p.noise(this.phase, t * this.speed) - 0.5) * 2 * this.amp;
        let oy = (p.noise(this.phase + 100, t * this.speed) - 0.5) * 2 * this.amp;
        // smooth interpolation toward float target
        let floatTargetX = this.baseX + ox + (this.avoidDX || 0);
        let floatTargetY = this.baseY + oy + (this.avoidDY || 0);
        this.currentX = p.lerp(this.currentX, floatTargetX, 0.06);
        this.currentY = p.lerp(this.currentY, floatTargetY, 0.06);
        // decay avoidance over time
        if (this.avoidTimer > 0) {
          this.avoidTimer--;
          this.avoidDX *= 0.92;
          this.avoidDY *= 0.92;
        } else {
          this.avoidDX = 0;
          this.avoidDY = 0;
        }
      }
    }

    display() {
      p.push();
      if (this.inSentence) {
        p.fill(255, 210, 50);
      } else {
        p.fill(255);
      }
      p.noStroke();
      p.text(this.text, this.currentX, this.currentY);
      p.pop();
    }

    contains(mx, my) {
      let w = p.textWidth(this.text);
      let ascent = p.textAscent();
      let descent = p.textDescent();
      let left = this.currentX;
      let right = this.currentX + w;
      let top = this.currentY - ascent;
      let bottom = this.currentY + descent;
      return mx >= left && mx <= right && my >= top && my <= bottom;
    }
  }
};

new p5(rightSketch);
