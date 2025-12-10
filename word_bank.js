let rightSketch = (p) => {
    let container;
    let vt323;

    let wordStrings = [];
    let words = [];
    let info;
    let sentence = []; // ordered list of words selected to form the sentence
    let currentSelectedWord = null; // last clicked word for showing options
    const MIN_DIST = 60; // minimum placement distance between words
    const SENTENCE_SPACING = 30; // pixels between words in the sentence

  p.preload = () => {
    info = p.loadTable("assets/etc/vocabulary.csv", "csv", "header");
    vt323 = p.loadFont("assets/etc/VT323-Regular.ttf");
  }
  
  p.setup = () => {
    container = document.getElementById("right-sketch");
    let w = container.offsetWidth;
    let h = container.offsetHeight;
    let c = p.createCanvas(w, h);
    c.parent(container);
    p.pixelDensity(1.3);

    p.textSize(18);
    p.textFont(vt323);
    p.textAlign(p.LEFT, p.BASELINE);

    wordStrings=info.getColumn("word");

    placeWords();
  };

  p.draw = () => {
    p.background(0);
    
    // draw help rectangle at top-left
    drawHelpBox();
    
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

        if (canChangeToOption(currentSelectedWord, optLabel)) {
          currentSelectedWord.options = { subject: false, object: false, verb: false, adverb: false };
          currentSelectedWord.options[optLabel] = true;

          // notify 3d_sketch of option change
          if (window.onOptionChanged && currentSelectedWord.inSentence) {
            window.onOptionChanged({
              word: currentSelectedWord.text,
              translation: currentSelectedWord.translation || currentSelectedWord.text,
              options: currentSelectedWord.options
            });
          }
          // notify bottom sketch to regenerate permutations
          if (currentSelectedWord.inSentence) {
            notifySentenceChange();
          }
        }
        return;
      }
    }

    // also try to click an option on any sentence word
    for (let s of sentence) {
      let optLabel = optionHit(p.mouseX, p.mouseY, s);
      if (optLabel) {
        if (!s.options) s.options = {};

        if (canChangeToOption(s, optLabel)) {
          s.options = { subject: false, object: false, verb: false, adverb: false };
          s.options[optLabel] = true;

          // notify 3d_sketch of option change
          if (window.onOptionChanged) {
            window.onOptionChanged({
              word: s.text,
              translation: s.translation || s.text,
              options: s.options
            });
          }
          // notify bottom sketch to regenerate permutations
          notifySentenceChange();
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

    let translationGroups = {};

    wordStrings.forEach(word => {
      let flags = { subject: false, object: false, verb: false, adverb: false };
      let translation = null;
      if (info) {
        let row = info.findRow ? info.findRow(word, 'word') : null;
        if (!row) {
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
            translation = row.get('translation') || null;
          } catch (e) {}
        }
      }

      if (!translation) translation = 'unknown';

      if (!translationGroups[translation]) {
        translationGroups[translation] = [];
      }
      translationGroups[translation].push({ word, flags, translation });
    });

    let groupKeys = Object.keys(translationGroups);
    let clusterCenters = {};

    let gridCols = Math.ceil(Math.sqrt(groupKeys.length));
    let gridRows = Math.ceil(groupKeys.length / gridCols);
    let cellWidth = w / gridCols;
    let cellHeight = h / gridRows;

    groupKeys.forEach((key, index) => {
      let col = index % gridCols;
      let row = Math.floor(index / gridCols);
      let cx = (col + 0.5) * cellWidth;
      let cy = (row + 0.5) * cellHeight;
      clusterCenters[key] = { x: cx, y: cy };
    });

    for (let translation in translationGroups) {
      let group = translationGroups[translation];
      let center = clusterCenters[translation];

      for (let item of group) {
        let attempts = 0;
        let placed = false;
        let x, y;

        while (!placed && attempts < 2000) {
          let offsetAngle = p.random(p.TWO_PI);
          let offsetDist = p.random(50, 150);
          x = center.x + p.cos(offsetAngle) * offsetDist;
          y = center.y + p.sin(offsetAngle) * offsetDist;

          x = p.constrain(x, 40, w - 40);
          y = p.constrain(y, 40, h - 40);
          
          // avoid help box area at top-left
          let helpBoxX = 10;
          let helpBoxY = 10;
          let helpBoxW = 200; // approximate width
          let helpBoxH = 60;
          let margin = 15;
          if (x >= helpBoxX - margin && x <= helpBoxX + helpBoxW + margin && 
              y >= helpBoxY - margin && y <= helpBoxY + helpBoxH + margin) {
            placed = false;
            attempts++;
            continue;
          }

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

        let ww = new Word(item.word, x, y, item.flags, item.translation);
        ww.clusterCenter = { x: center.x, y: center.y };
        let cxMin = p.width * 0.35;
        let cxMax = p.width * 0.65;
        let cyMin = p.height * 0.35;
        let cyMax = p.height * 0.65;
        ww.isCenterCandidate = (x >= cxMin && x <= cxMax && y >= cyMin && y <= cyMax);
        ww.origBaseX = x;
        ww.origBaseY = y;
        words.push(ww);
      }
    }
  }

  // draw help box at top-left
  function drawHelpBox() {
    let padding = 10;
    let cornerRadius = 6;
    let boxX = 10;
    let boxY = 10;
    
    // measure text to calculate box size
    p.push();
    p.textSize(18);
    p.textAlign(p.LEFT, p.TOP);
    let text = "1. click on words to create a phrase.\n2. select its syntactic role."; //add: select its syntactic role
    let textH = 45;
    
    let boxH = textH + padding * 2;
    
    // draw background box
    p.fill(20);
    p.stroke(80);
    p.strokeWeight(1);
    p.rect(boxX, boxY, 290, boxH, cornerRadius);
    p.noStroke();
    
    // draw text
    p.fill(200);
    p.text(text, boxX + padding, boxY + padding, 290);
    p.pop();
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
        let sh = p.textAscent() + p.textDescent() + 72;
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
          other.avoidDX = (other.avoidDX || 0) + ux * 60;
          other.avoidDY = (other.avoidDY || 0) + uy * 60;
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
    w.inSentence = false;

    let attempts = 0;
    let placed = false;
    let x, y;

    while (!placed && attempts < 2000) {
      if (w.clusterCenter) {
        let offsetAngle = p.random(p.TWO_PI);
        let offsetDist = p.random(50, 150);
        x = w.clusterCenter.x + p.cos(offsetAngle) * offsetDist;
        y = w.clusterCenter.y + p.sin(offsetAngle) * offsetDist;
      } else {
        x = p.random(40, p.width - 40);
        y = p.random(40, p.height - 40);
      }

      x = p.constrain(x, 40, p.width - 40);
      y = p.constrain(y, 40, p.height - 40);

      let cxMin = p.width * 0.30;
      let cxMax = p.width * 0.70;
      let cyMin = p.height * 0.30;
      let cyMax = p.height * 0.70;
      if (x >= cxMin && x <= cxMax && y >= cyMin && y <= cyMax) {
        attempts++;
        continue;
      }

      placed = true;
      for (let other of words) {
        let otherX = other.currentX || other.baseX;
        let otherY = other.currentY || other.baseY;
        if (p.dist(x, y, otherX, otherY) < MIN_DIST) {
          placed = false;
          break;
        }
      }
      attempts++;
    }

    if (!placed) {
      x = p.random(40, p.width - 40);
      y = p.random(40, p.height - 40);
    }

    w.baseX = x;
    w.baseY = y;
    w.targetX = x;
    w.targetY = y;
    w.avoidDX = (p.random() - 0.5) * 80;
    w.avoidDY = (p.random() - 0.5) * 80;
    w.avoidTimer = 60;
  }

  // draw options for a word; positioned below the word text
  function drawOptionsForWord(word) {
    if (!word) return;
    const labels = ['subject', 'object', 'verb', 'adverb'];
    const lineHeight = 18;
    let y = word.currentY + 15;
    let maxWidth = 0;

    for (let lab of labels) {
      let available = word.flags ? word.flags[lab] : false;
      if (available) {
        maxWidth = p.max(maxWidth, p.textWidth(lab));
      }
    }

    let startX = word.currentX + p.textWidth(word.text) / 2 - maxWidth / 2;

    for (let lab of labels) {
      let available = word.flags ? word.flags[lab] : false;
      if (!available) {
        continue;
      }
      p.push();
      let selected = word.options && word.options[lab];
      let canChange = canChangeToOption(word, lab);

      if (selected) {
        p.fill('#1fa628ff');
      } else if (canChange) {
        p.fill('#ffffffff');
      } else {
        p.fill('#4c4c4cff');
      }

      p.textAlign(p.LEFT, p.BASELINE);
      p.text(lab, startX, y);
      p.pop();
      y += lineHeight;
    }
  }

  // option hit test: check if click is on an option near a word
  function optionHit(mx, my, word) {
    if (!word) return null;
    const labels = ['subject', 'object', 'verb', 'adverb'];
    const lineHeight = 18;
    let y = word.currentY + 15;
    let maxWidth = 0;

    for (let lab of labels) {
      let available = word.flags ? word.flags[lab] : false;
      if (available) {
        maxWidth = p.max(maxWidth, p.textWidth(lab));
      }
    }

    let startX = word.currentX + p.textWidth(word.text) / 2 - maxWidth / 2;

    for (let lab of labels) {
      let available = word.flags ? word.flags[lab] : false;
      if (!available) {
        continue;
      }
      let w = p.textWidth(lab);
      let h = p.textSize();
      if (mx >= startX && mx <= startX + w && my >= y - h && my <= y) {
        return lab;
      }
      y += lineHeight;
    }
    return null;
  }

  function getSelectedWordType(word) {
    if (!word.options) return null;
    if (word.options.subject) return 'subject';
    if (word.options.verb) return 'verb';
    if (word.options.adverb) return 'adverb';
    if (word.options.object) return 'object';
    return null;
  }

  function canChangeToOption(word, optionType) {
    if (optionType === 'subject' || optionType === 'verb') {
      let count = sentence.filter(w => {
        if (w === word) return false;
        let type = getSelectedWordType(w);
        return type === optionType;
      }).length;
      if (count >= 1) return false;
    }
    return true;
  }

  function canAddWordToSentence(word) {
    if (word.flags) {
      let availableOptions = [];
      if (word.flags.subject) availableOptions.push('subject');
      if (word.flags.object) availableOptions.push('object');
      if (word.flags.verb) availableOptions.push('verb');
      if (word.flags.adverb) availableOptions.push('adverb');

      if (availableOptions.length === 1) {
        let optionType = availableOptions[0];
        if (optionType === 'subject' || optionType === 'verb') {
          let count = sentence.filter(w => {
            let type = getSelectedWordType(w);
            return type === optionType;
          }).length;
          if (count >= 1) return false;
        }
      }
    }
    return true;
  }

  function toggleWordInSentence(word) {
    if (!word.inSentence) {
      if (!canAddWordToSentence(word)) {
        return;
      }

      for (let w of words) {
        if (w !== word && w.isCenterCandidate && !w.inSentence) {
          let cx = p.width / 2;
          let cy = p.height / 2;
          if (p.dist(w.currentX, w.currentY, cx, cy) < Math.max(p.width, p.height) * 0.25) {
            ejectWordToNewPlace(w);
          }
        }
      }

      sentence.push(word);
      word.inSentence = true;

      if (word.flags) {
        let availableOptions = [];
        if (word.flags.subject) availableOptions.push('subject');
        if (word.flags.object) availableOptions.push('object');
        if (word.flags.verb) availableOptions.push('verb');
        if (word.flags.adverb) availableOptions.push('adverb');

        if (availableOptions.length === 1) {
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
    notifySentenceChange();
  }

  function notifySentenceChange() {
    // notify bottom sketch of full sentence with all word data
    if (window.onSentenceChanged) {
      let sentenceData = sentence.map(w => ({
        text: w.text,
        translation: w.translation || w.text,
        options: w.options || {}
      }));
      window.onSentenceChanged(sentenceData);
    }
  }

  function updateSentenceTargets() {
    if (sentence.length === 0) {
      for (let w of words) {
        if (w.isCenterCandidate && w.origBaseX !== undefined) {
          w.baseX = w.origBaseX;
          w.baseY = w.origBaseY;
        }
        w.targetX = w.baseX;
        w.targetY = w.baseY;
      }
      return;
    }

    // Keep words in selection order (as they appear in sentence array)
    let orderedSentence = sentence;

    let widths = orderedSentence.map(s => p.textWidth(s.text));
    let totalW = widths.reduce((a, b) => a + b, 0) + SENTENCE_SPACING * (orderedSentence.length - 1);
    let startX = (p.width - totalW) / 2;
    let centerY = p.height / 2;
    let x = startX;
    for (let i = 0; i < orderedSentence.length; i++) {
      let s = orderedSentence[i];
      s.targetX = x;
      s.targetY = centerY;
      x += widths[i] + SENTENCE_SPACING;
    }
  }

  class Word {
    constructor(text, x, y, flags = { subject:false, object:false, verb:false, adverb:false }, translation = null) {
      this.text = text;
      this.translation = translation;
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
        // smooth interpolation toward float target (slower for smoothness)
        let floatTargetX = this.baseX + ox + (this.avoidDX || 0);
        let floatTargetY = this.baseY + oy + (this.avoidDY || 0);
        
        // check if floating into help box and repel
        let helpBoxX = 10;
        let helpBoxY = 10;
        let helpBoxW = 250;
        let helpBoxH = 60;
        let repelMargin = 30;
        if (floatTargetX >= helpBoxX - repelMargin && floatTargetX <= helpBoxX + helpBoxW + repelMargin &&
            floatTargetY >= helpBoxY - repelMargin && floatTargetY <= helpBoxY + helpBoxH + repelMargin) {
          // repel outward from help box center
          let boxCenterX = helpBoxX + helpBoxW / 2;
          let boxCenterY = helpBoxY + helpBoxH / 2;
          let angle = p.atan2(floatTargetY - boxCenterY, floatTargetX - boxCenterX);
          let pushDist = 40;
          this.avoidDX = p.cos(angle) * pushDist;
          this.avoidDY = p.sin(angle) * pushDist;
          this.avoidTimer = 60;
        }
        
        // slower lerp for smoother floating (reduced from 0.06 to 0.04)
        this.currentX = p.lerp(this.currentX, floatTargetX, 0.04);
        this.currentY = p.lerp(this.currentY, floatTargetY, 0.04);
        
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
        p.fill('#00ff11ff');
      } else {
        let canAdd = canAddWordToSentence(this);
        if (canAdd) {
          p.fill(255);
        } else {
          p.fill('#4c4c4cff'); //if can't add to sentence
        }
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
