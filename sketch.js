/*
  Data and Machine Learning for Artistic Practice (DMLAP)
  Spring Term 2024
  Regression Example 02

  In this code we create colour markers on the screen, each time saving their coordinates
  and r,g,b values and providing them to our neural network.
  e.g. nnAddData(inputs, output); in mousePressed();

  Once we have enough points we call nnTrain();
  This trains the neural network.

  The demo will show a GRID with all the colours predicted at each position.

  Instructions:
  - Click to place a point,
  - Press 1 to 3 to change the colour of the points
  - Press 't' to train the model

  All information to customise your neural network and training can be found here:
  https://learn.ml5js.org/#/reference/neural-network
*/

let nn,
    mode = "training";

let data_points = [];

let noteIndex = 0;
let noteTime = 0;
let midiVal, freq;
let startTime;
let currentNoteLength;

function setup() {
  createCanvas(500, 500);

  // set our background once at the start
  background(255);

  ourColor = color(255,0,0);

  // Setup the neural network
  // For each example, the network has two inputs [x, y] (the mouse position)
  // and three outputs [r, g, b] (the corresponding colour)
  // (Here we use the default config. To add more, look here under 'regression':
  // https://learn.ml5js.org/#/reference/neural-network?id=defining-custom-layers)
  nn = ml5.neuralNetwork({
    inputs: 2,          // two inputs: x and y
    outputs: 3,         // three outputs: r, g and b
    task: 'regression', // because we predict the three numbers directly (r/g/b values)
    debug: true         // this opens the training pane
  });

  osc = new p5.TriOsc();
  env = new p5.Envelope();

}

function draw() {
  // Note in this demo we update the canvas every frame
  background(200);

  fill(0);
  noStroke();
  text("Click to place a point\nPress 1-3 to change color\nPress 't' to train.", 20, 20);

  fill(ourColor);
  stroke(1);
  ellipse(mouseX, mouseY, 5, 5);

  // Draw the grid
   if (mode === "demo") {
     drawGrid();

     let elapsedTime = millis() - startTime;

     if (noteIndex == 0 || elapsedTime > currentNoteLength) {
       startSound();
     }
   }

  // Draw our data points
  for (const p of data_points){
    fill(p.r, p.g, p.b);
    stroke(0);
    ellipse(p.x, p.y, 10, 10);
  }


}

function mousePressed() {
  if (mode == "training") {
    // Draw a circle at our mouse coordinates, set to the colour of our current colour.
    let inputs = [mouseX, mouseY];
    let outputs = [red(ourColor), 
                  green(ourColor), 
                  blue(ourColor)];
    data_points.push({x: mouseX, 
                      y: mouseY,
                      r: red(ourColor), 
                      g: green(ourColor), 
                      b: blue(ourColor)});
    nn.addData(inputs, outputs);
  }
}

// Draw the grid
function drawGrid() {
  let step = 20; // The square size for the grid

  // Collect center points of each cell and put the points in an array
  // (the array will be ordered by rows of the grid)
  let inputs = [];
  for (let y = 0; y < width; y += step){
    for (let x = 0; x < height; x += step){
      inputs.push([(x + step/2), (y + step/2)]);
    }
  }

  // Predict colors for ALL collected center points
  let res = nnPredict(inputs);

  // Now draw the grid with the predicted colors
  let i = 0;
  for (let y = 0; y < width; y += step){
    for (let x = 0; x < height; x += step){
      const clr = res[i];
      fill(clr[0], clr[1], clr[2]);
      rect(x, y, step, step);
      i += 1; // Increment cell (recall these are ordered by row and the inner loop
    }         // goes along a row)
  }
}

function startSound() {
  startTime = millis();

  let step = 20; // The square size for the grid

  let inputs = [];
  for (let y = 0; y < width; y += step){
    for (let x = 0; x < height; x += step){
      inputs.push([(x + step/2), (y + step/2)]);
    }
  }

  let res = nnPredict(inputs);

  currentNoteLength = res[noteIndex % data_points.length][0] + 100;
  midiVal = res[noteIndex % data_points.length][1] + 50;
  volume = res[noteIndex % data_points.length][2]/(2*255) + 0.5;
  // see also: userStartAudio();
  osc.start();

  freq = midiToFreq(midiVal);
  osc.freq(freq);
  env.ramp(osc, 0, volume, 0);

  noteIndex++;
}

function keyPressed() {
  // Switch is equivalent to a series of if-else statements
  switch (key) {
    // 1, 2, 3 select colors              // IDEA: add more colors?
    case "1":
      ourColor = color(255,0,0);
      break; // Important to call break after each "case" otherwise execution will continue to the next
    case "2":
      ourColor = color(0,255,0);
      break;
    case "3":
      ourColor = color(0,0,255);
      break;
    // "t" starts training the neural network! (see brain.js)
    case "t":
      // WHERE THE TRAINING HAPPENS: no need to change this
      // More information here: https://learn.ml5js.org/#/reference/neural-network?id=train
      nn.normalizeData();    // Normalise our data
      nn.train({
        epochs: 35,          // This controls for how long we train!
        batchSize: 32,       // We will see what all this means soon
        learningRate: 0.2,
        validationSplit: 0.0 // By default we won't perform any validation (this does not influence training, but removes datapoints if > 0)
      }, finishedTraining);  // This is a callback: the function finishedTraining is called when the training is over
      mode = "demo";         // This signals that we want to see updates as we train (might slow down training)
      break;
    case "s":
      saveData("data.json");
      break;
  //   case "l":
  //     loadData("data.json");
  //     break;
  }
}

// This will actually download a file. 
function saveData(path){
  saveJSON(data_points, './data.json');
}

// If you want to load existing data:
// Loading and saving
// function loadData(path){
//   function loaded(json){
//     // Clear the neural network
//     nn = ml5.neuralNetwork({
//       inputs: 2,          // two inputs: x and y
//       outputs: 3,         // three outputs: r, g and b
//       task: 'regression', // because we predict the three numbers directly (r/g/b values)
//       debug: true         // this opens the training pane
//     });
//     // Load existing data if any
//     data_points = json;
//     // if we have points add them
//     for (const data of data_points){
//       let input = [data.x, data.y];
//       let output = [data.r, data.g, data.b];
//       // this adds the data to the neural network
//        nn.addData(input, output);
//     }
//   }
//   loadJSON(path, loaded);
// }

// about the NN
function finishedTraining(){
  console.log("We finished training!");
  console.log("Here's how one raw prediction looks like for one datapoint:");
  console.log(nn.predictSync([width/2,height/2])); // prediction for the centre of the canvas
}

function nnPredict(input) {

  // The standard ML5js way to perform predictions is asyncronous, but async
  // programming can be tricky. Luckily the "predictSync" function forces ML5js
  // to give us the result immediately and simplifies matters
  const res = nn.predictSync(input);

  // ML5 places each component of the prediction into an object.
  // As a result, the format of the output of a prediction is different from
  // the one given as training data. E.g. if we trained the network with one
  // input array [x] and an output array [a, b, c] one prediction will give
  // [{0:predicted_a, label: 0, value:predicted_a, unNormalizedValue: unnormalized_predicted_a},
  //  {1:predicted_b, label: 1, value:predicted_b, unNormalizedValue: unnormalized_predicted_b},
  //  {2:predicted_c, label: 2, value:predicted_c, unNormalizedValue: unnormalized_predicted_c}]
  // meaning that with "straight" ML5js we will need to parse these values and
  // put them into our preferred format (which is likely the one we provided in
  // the first place as training data).

  // If we provide an array of inputs (asking for multiple predictions),
  // predictedSync will return an array of such objects, so here we handle the
  // two cases making it consistent with the input format
  if (Array.isArray(input[0])){
    // multiple predictions
    return res.map(element => element.map(v => v.value));
  } else {
    // make one prediction
    return res.map(v => v.value);
  }
}
