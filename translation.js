let bottomSketch = (p) => {

  let container;

  p.setup = () => {
    container = document.getElementById("bottom-row");
    let w = container.offsetWidth;
    let h = container.offsetHeight;

    let c = p.createCanvas(w, h);
    c.parent(container);
  };

  p.windowResized = () => {
    let w = container.offsetWidth;
    let h = container.offsetHeight;
    p.resizeCanvas(w, h);
  };

  p.draw = () => {
    p.background(120);
  };
};

new p5(bottomSketch);
