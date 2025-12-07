let languageRulesSketch = (p) => {
  let container;
  let vt323;
  let buttons = ["physical properties", "concepts limiting language", "syntax", "verbs"];
  let buttonRects = [];
  let selectedButton = 0;

  p.preload = () => {
    // reuse font if available
    try {
      vt323 = p.loadFont('assets/etc/VT323-Regular.ttf');
    } catch (e) {}
  };

  p.setup = () => {
    container = document.getElementById('language-rules');
    let w = container.offsetWidth;
    let h = container.offsetHeight;
    let c = p.createCanvas(w, h);
    c.parent(container);

    p.textFont(vt323 || 'monospace');
    p.textAlign(p.LEFT, p.TOP);
  };

  p.windowResized = () => {
    if (!container) return;
    let w = container.offsetWidth;
    let h = container.offsetHeight;
    p.resizeCanvas(w, h);
  };

  p.draw = () => {
    p.background(0);
    p.noStroke();

    p.textSize(35);
    p.fill('#4c4c4cff');
    p.text('language rules', 10, 10);

    p.textSize(16);

    // draw buttons on the left
    let y = 60;
    buttonRects = [];
    for (let i = 0; i < buttons.length; i++) {
      let b = buttons[i];
      let textW = p.textWidth(b);
      let rectX = 20;
      let rectY = y - 12;
      let rectW = 40 + textW; // include space for ellipse and padding
      let rectH = 24;

      // store rect for hit testing
      buttonRects[i] = { x: rectX, y: rectY, w: rectW, h: rectH };

      // highlight selected
      if (selectedButton === i) {
        p.fill('#00ff11ff');
      } else {
        p.fill(200);
      }
      // ellipse marker
      p.ellipse(40, y, 15);

      // label
      if (selectedButton === i) p.fill('#00ff11ff'); else p.fill(180);
      p.text(b, 50, y - 8);

      y += 30;
    }

    // draw right-side panel content
    let panelX = 250;
    let panelY = 15;
    let panelW = p.width - panelX - 10;
    let panelH = p.height - 20;

    p.fill(10);
    p.stroke(60);
    p.rect(panelX, panelY, panelW, panelH, 6);
    p.noStroke();

    p.fill(220);
    p.textSize(14);
    let contentX = panelX + 12;
    let contentY = panelY + 18;

    let contents = [
        '1. Logographic vocabulary with no phonetic equivalent.\n2. Magnetism towards a center.\n3. Molecular-like connection between phrases with inclination towards the circular shape.\n   → A new phrase appears at the least distance possible from the main center.\n4. Words are a repetition of a symbol around a circle: although the symbols themselves might not be circular, this repetition around an axis makes the words and thus phrases, spherical.',
        '1. Time \n→As time is circular and actions will happen in all tenses, it is unnecessary to specify the tense. (i.e. I have eaten before, I am eating now, and I will eat again in the future)\n→For this same reason, no adjectives, adverbs or any other vocabulary pertaining to time exists.\n→As time (and life) is circular, there is no beginning and no end, only a point in a cycle where everything is repeated.\n2. Unity\n→There is no distinction of the personal, and thus, the individual. The only way to present a living being is plural. All is pluralized. Nouns have no distinction between singular and plural.\n→Although objects (non-living, other-living) do have a sense of the singular (i.e. one rock,) the same unclear distinction is applied.',
        '1. Syntax is expressed through morphology. For which the order of the words does not matter. Grammatical "cases"=repetition.\n2. The amount of times a word is **repeated** in its own layer (how many axis the circle is divided into) depends on its syntactic structure.\n   →Subject (nominative): Repeated 12 times.\n   →Object (accusative): Repeated 8 times.\n   →Verb: Repeated 20 times.\n3. The order of the words within a sentence (inside to outside) do not matter as there is no linear time and space.',
        '1. Verbs are never conjugated\n2. There is no difference on if something is or happens.\n   →There is no verb "to be" (i.e. "moon big" is a complete sentence)\n   →The same word would be used for a verb as for a subject. The differentiation comes through its repetition.'
    ];

    let lines = contents[selectedButton].split('\n');
    for (let i = 0; i < lines.length; i++) {
      p.text(lines[i], contentX, contentY + i * 18, panelW-36);
    }
  };

  p.mousePressed = () => {
    if (!buttonRects || buttonRects.length === 0) return;
    // only respond if click inside this canvas
    if (p.mouseX < 0 || p.mouseY < 0 || p.mouseX > p.width || p.mouseY > p.height) return;

    for (let i = 0; i < buttonRects.length; i++) {
      let r = buttonRects[i];
      if (p.mouseX >= r.x && p.mouseX <= r.x + r.w && p.mouseY >= r.y && p.mouseY <= r.y + r.h) {
        selectedButton = i;
        return;
      }
    }
  };
};

new p5(languageRulesSketch);
