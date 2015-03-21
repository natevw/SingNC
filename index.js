var midi = require('midi');


function freq(n) {      // using http://newt.phys.unsw.edu.au/jw/notes.html temperment
  return Math.pow(2, (n-69) / 12) * 440;
}

function vector(freqs, time) {
  freqs.sort().reverse();
  
}


var poll = setInterval(function () {
  var numInputs = input.getPortCount();
  if (!numInputs) return;
  else clearInterval(poll);
  
  console.log("Input connected:", input.getPortName(0));
  input.openPort(0);
  
  var notes = Object.create(null);
  input.on('message', function(dt, msg) {
    //console.log(dt, msg);
    
    var cmd = (msg[0] & 0xF0);
    if (cmd === 0x80 || cmd === 0x90 && msg[2] === 0) {
      delete notes[msg[1]];
    } else if (cmd === 0x90) {
      notes[msg[1]]= msg[2];
    }
    console.log("Notes:", Object.keys(notes).map(freq));
  });
  //input.closePort();
}, 1e3), input = new midi.input();
