var midi = require('midi'),
    com1 = require('serialport');


var axes = ['Y', 'X', 'Z', 'A', 'B', 'C'],      // order: from longest axes to least present
    mult = [400.000, -400.000, -400.000];
axes.length = 3;      // truncate to what machine has

function freq(n) {      // using http://newt.phys.unsw.edu.au/jw/notes.html temperment
  return Math.pow(2, (n-69) / 12) * 440;
}

var state = {
  notes: [],
  mtime: 100
};
setInterval(function () {
  if (!state.notes.length) return;
  
  // get the actual frequencies and sort highest first
  var freqs = state.notes.map(freq).sort().reverse();
  
  // respective axis must do `scale*freq` steps in our time.
  var moveTime = state.mtime + 10,       // fudge a bit for our slowness
      distSqd = 0, tScale = (moveTime / 1e3);
  var mvmt = freqs.slice(0, axes.length).map(function (freq, i) {
    var stepsNeeded = freq * tScale,
        stepsPerUnit = mult[i],
        units = stepsNeeded / stepsPerUnit;
    distSqd += units*units;
    return axes[i]+units.toFixed(4);
  });
  
  // whole move must complete in `state.mtime` milliseconds.
  var rate = 60e3 * Math.sqrt(distSqd) / moveTime;
  
  var cmd = ['G1', 'F'+rate.toFixed(2)].concat(mvmt).join(' ');
  sendCommand(cmd);
}, state.mtime);

var poll_midi = setInterval(function () {
  var numInputs = input.getPortCount();
  if (!numInputs) return;
  else clearInterval(poll_midi);
  
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
    state.notes = Object.keys(notes);
  });
  //input.closePort();
}, 1e3), input = new midi.input();

var cncPort;
function poll_com1() {
  com1.list(function (e, arr) {
    if (e) throw e;
    var cnc = arr.filter(function (port) {
      return port.locationId;
    })[0];
    if (!cnc) setTimeout(poll_com1, 1e3);
    else new com1.SerialPort(cnc.comName, {
      baudrate: 115200,
      parser: com1.parsers.readline("\n")
    }).on('open', function () {
      console.log("Output opened:", cnc.comName);
      cncPort = this;
      cncPort.once('data', function () {
        // unlock, initialize necessary motion modes
        if (0) {
          sendCommand("$X");
        } else {
          sendCommand("$H");
          sendCommand("G0 X0 Y-190");
        }
        sendCommand("G21 G91 G94");
      });
      cncPort.on('data', function (d) {
        console.log(d.toString());
      });
    }).on('error', function (e) {
      console.error(e);
      cncPort = null;
    });
  });
}
function sendCommand(str) {
  console.log(str, (cncPort) ? '' : '~');
  if (cncPort) cncPort.write(str+'\n');
}
poll_com1();