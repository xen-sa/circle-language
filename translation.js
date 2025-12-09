let bottomSketch = (p) => {

  let container;
  let vt323;
  let info;
  let currentSentence = [];
  let allPermutations = [];
  let scrollOffset = 0;
  let autoScrollSpeed = 1; // pixels per frame; set to 0 to disable auto-scroll
  let autoScrollDirection = 1; // 1 for down, -1 for up

  p.preload = () => {
    info = p.loadTable("assets/etc/vocabulary.csv", "csv", "header");
    vt323 = p.loadFont("assets/etc/VT323-Regular.ttf");
  };

  p.setup = () => {
    container = document.getElementById("translation-container");
    p.pixelDensity(1.3);
    let w = container.offsetWidth;
    let h = container.offsetHeight;

    let c = p.createCanvas(w, h);
    c.parent(container);

    p.textFont(vt323);
    p.textAlign(p.LEFT, p.TOP);

    window.onSentenceChanged = (sentenceData) => {
      updateSentence(sentenceData);
    };
  };

  p.windowResized = () => {
    let w = container.offsetWidth;
    let h = container.offsetHeight;
    p.resizeCanvas(w, h);
  };

  p.mouseWheel = (event) => {
    if (p.mouseX >= 0 && p.mouseY >= 0 && p.mouseX <= p.width && p.mouseY <= p.height) {
      scrollOffset += event.delta * 0.5;

      let maxScroll = getMaxScrollOffset();
      scrollOffset = p.constrain(scrollOffset, 0, p.max(0, maxScroll));

      return false;
    }
  };

  p.draw = () => {
    p.background(0);

    p.textSize(35);
    p.fill('#4c4c4cff');
    p.text('current phrase', 10, 10);

    if (currentSentence.length === 0) {
      scrollOffset = 0;
      return;
    }

    // apply auto-scroll
    let maxScroll = getMaxScrollOffset();
    if (maxScroll > 0 && autoScrollSpeed > 0) {
      scrollOffset += autoScrollSpeed * autoScrollDirection;
      
      // stop at bottom, bounce back at top
      if (scrollOffset >= maxScroll) {
        scrollOffset = maxScroll;
        autoScrollDirection = 0; // stop scrolling
      } else if (scrollOffset <= 0) {
        scrollOffset = 0;
        autoScrollDirection = 1;
      }
    }

    let orderedSentence = getOrderedSentence(currentSentence);

    p.textSize(24);
    p.fill('#00ff11ff');
    let currentText = orderedSentence.map(w => w.text).join(' ');
    p.text(currentText, 40, 45);

    p.textSize(18);
    p.fill(200);
    let yOffset = 80 - scrollOffset;
    let xOffset = 40;
    let lineHeight = 25;
    let maxWidth = p.width - 40;

    for (let perm of allPermutations) {
      let permText = perm.join(' ');

      if (p.textWidth(permText) > maxWidth) {
        yOffset += lineHeight;
        xOffset = 20;
      }

      if ((yOffset + lineHeight -10 > 75 && yOffset + lineHeight < p.height - 5)) {
        p.text(permText, xOffset, yOffset);
      }
      yOffset += lineHeight;
    }

    if (maxScroll > 0) {
      drawScrollbar(maxScroll);
    }
  };

  function getMaxScrollOffset() {
    let lineHeight = 25;
    let totalHeight = allPermutations.length * lineHeight;
    let availableHeight = p.height - 70;
    return totalHeight - availableHeight;
  }

  function drawScrollbar(maxScroll) {
    let scrollbarX = p.width - 15;
    let scrollbarY = 70;
    let scrollbarHeight = p.height - 80;
    let scrollbarWidth = 8;

    p.fill(80);
    p.noStroke();
    p.rect(scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight);

    let thumbHeight = p.max(20, scrollbarHeight * (scrollbarHeight / (scrollbarHeight + maxScroll)));
    let thumbY = scrollbarY + (scrollOffset / maxScroll) * (scrollbarHeight - thumbHeight);

    p.fill(180);
    p.rect(scrollbarX, thumbY, scrollbarWidth, thumbHeight, 4);
  }

  function getSelectedWordType(wordData) {
    if (!wordData.options) return null;
    if (wordData.options.subject) return 'subject';
    if (wordData.options.verb) return 'verb';
    if (wordData.options.adverb) return 'adverb';
    if (wordData.options.object) return 'object';
    return null;
  }

  function getOrderedSentence(sentenceData) {
    let subjects = sentenceData.filter(w => getSelectedWordType(w) === 'subject');
    let verbs = sentenceData.filter(w => getSelectedWordType(w) === 'verb');
    let adverbs = sentenceData.filter(w => getSelectedWordType(w) === 'adverb');
    let objects = sentenceData.filter(w => getSelectedWordType(w) === 'object');
    return [...subjects, ...verbs, ...objects, ...adverbs];
  }

  function updateSentence(sentenceData) {
    currentSentence = sentenceData;
    generatePermutations();
    scrollOffset = 0;
  }

  function generatePermutations() {
    if (currentSentence.length === 0) {
      allPermutations = [];
      return;
    }

    let orderedSentence = getOrderedSentence(currentSentence);
    let alternativesPerPosition = [];

    for (let wordData of orderedSentence) {
      let alternatives = [];

      let selectedOption = null;
      if (wordData.options) {
        if (wordData.options.subject) selectedOption = 'subject';
        else if (wordData.options.object) selectedOption = 'object';
        else if (wordData.options.verb) selectedOption = 'verb';
        else if (wordData.options.adverb) selectedOption = 'adverb';
      }

      if (info && wordData.translation && selectedOption) {
        for (let r = 0; r < info.getRowCount(); r++) {
          try {
            let rowTranslation = info.getString(r, 'translation');
            let rowWord = info.getString(r, 'word');
            let rowOptionValue = String(info.getString(r, selectedOption) || '').toLowerCase() === 'true';

            if (rowTranslation === wordData.translation && rowOptionValue) {
              alternatives.push(rowWord);
            }
          } catch (e) {}
        }
      }

      if (alternatives.length === 0) {
        alternatives.push(wordData.text);
      }

      alternativesPerPosition.push(alternatives);
    }

    allPermutations = cartesianProduct(alternativesPerPosition);
  }

  function cartesianProduct(arrays) {
    if (arrays.length === 0) return [[]];
    if (arrays.length === 1) return arrays[0].map(item => [item]);

    let result = [];
    let firstArray = arrays[0];
    let restProduct = cartesianProduct(arrays.slice(1));

    for (let item of firstArray) {
      for (let restItems of restProduct) {
        result.push([item, ...restItems]);
      }
    }

    return result;
  }
};

new p5(bottomSketch);
