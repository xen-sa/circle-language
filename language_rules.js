let languageRulesSketch = (p) => {
  let container;
  let vt323;
  let buttons = ["gravitational pull", "circular time", "perpetual unity", "rotation"];
  let buttonRects = [];
  let selectedButton = 0;
  let rotationImage;
  let unityImage;
  let gravityImage;


  p.preload = () => {
    // reuse font if available
    try {
      vt323 = p.loadFont('assets/etc/VT323-Regular.ttf');
    } catch (e) {}
    rotationImage = p.loadImage('assets/etc/rotation.gif');
    unityImage = p.loadImage('assets/etc/unity.png');
    gravityImage = p.loadImage('assets/etc/gravity.gif');
  };

  p.setup = () => {
    container = document.getElementById('language-rules');
    p.pixelDensity(1.3);
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

    p.textSize(20);

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
      p.ellipse(40, y+4, 15);

      // label
      if (selectedButton === i) p.fill('#00ff11ff'); else p.fill(180);
      p.text(b, 55, y - 8);

      y += 30;
    }

    // draw right-side panel content
    let panelX = 250;
    let panelY = 15;
    let panelW = p.width - panelX - 10;
    let panelH = p.height - 20;
    let imageW = panelH *0.6;
    let imageX = panelX+panelW*0.6 + imageW;
    let imageY = panelY + 36;

    p.fill(10);
    p.stroke(60);
    p.rect(panelX, panelY, panelW, panelH, 6);
    p.noStroke();

    p.fill(220);
    p.textSize(18);
    let contentX = panelX + 12;
    let contentY = panelY + 18;

    let content = getContent(selectedButton);
    let img = getImage(selectedButton);           

    if (selectedButton == 1 || selectedButton == 2) {
      p.text(content, contentX, contentY, panelW-36);
    } else{
      p.text(content, contentX, contentY, panelW * 0.7);
      p.image(img,imageX,imageY,imageW,imageW);
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

  // flexible content handler using switch-case
  function getContent(buttonIndex) {
    switch(buttonIndex) {
      case 0: // "gravitational pull"
        return "1. Phrases are built through a magnetism towards a center. Words float naturally gravitating towards the same axis, creating a connection to create a phrase.\n" + 
        "";
      
      case 1: // "circular time"
        return "1. Actions always have happened, are happening and will happen: it is unnecessary to specify the tense, there are no conjugations.\n" + 
        "2. No adjectives, adverbs or any other vocabulary pertaining to time exists.\n" + 
        "3. There is no beginning and no end, only a point in a cycle where everything is repeated.\n" + 
        '4. There is no difference between being and happening: there is no verb “to be."\n' + 
        "5. The order of the words within a sentence do not matter: there is no linearity.";

      case 2: // "constant unity"
        return "1. There is no distinction of the personal, and thus, the individual: There is no distinction between first, second, or third person.\n" + 
        "2. The only way of a being is plural. All is pluralized: Nouns have no distinction between singular and plural.";

      case 3: // "rotation"
        return "1. Words are a repetition of a symbol around an axis.\n" + 
        "2. The amount of times a word is repeated in its own layer represents its syntactic structure.\n" + 
        "----Subject (nominative): Repeated 12 times. \n" + 
        "----Object (accusative): Repeated 8 times.\n" + 
        "----Verb: Repeated 20 times.";

      default:
        return "No content available.";
    }
  }

  function getImage(buttonIndex) {
    switch(buttonIndex) {
      case 0: // "gravitational pull"
        return gravityImage;
      case 1: // "circular time"
        return null;
      case 2: // "constant unity"
        return null;
      case 3: // "rotation"
        return rotationImage;
      default:
        return null;
    }
  }
};

new p5(languageRulesSketch);
