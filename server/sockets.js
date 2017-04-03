// fast hashing library
const xxh = require('xxhashjs');
const Character = require('./Character.js');

const characters = {};

// our socketio instance
let io;
// function to setup our socket server
const setupSockets = (ioServer) => {
  // set our io server instance
  io = ioServer;

  // on socket connections
  io.on('connection', (sock) => {
    const socket = sock;

    socket.join('room1'); // join user to our socket room

    // create a unique id
    const hash = xxh.h32(`${socket.id}${new Date().getTime()}`, 0xCAFEBABE).toString(16);

    // create a new character and store it by its unique id
    characters[hash] = new Character(hash);
    // add the id to the user's socket object for quick reference
    socket.hash = hash;

    // emit a joined event to the user and send them their character
    socket.emit('joined', characters[hash]);

    // when this user sends the server a movement update
    socket.on('movementUpdate', (data) => {
      // to get prev added gravity speed
      let gravSpeed = data.gravitySpeed;
      // get curr Y pos
      let deY = data.destY;
      // for when we reach bottom
      let bottomY = 0;
      // movingDown
      let mD = true;
      // movingUp
      let mU = data.moveUp;
      if (data.moveDown) {
        gravSpeed += data.gravity;
        deY += data.speedY + gravSpeed;
      }
      if (deY >= 378) {
        bottomY = 379;
        mD = false;
        mU = false;
      }
      characters[socket.hash] = data;
      characters[socket.hash].deY = deY;
      characters[socket.hash].gravSpeed = gravSpeed;
      characters[socket.hash].bottomY = bottomY;
      characters[socket.hash].mD = mD;
      characters[socket.hash].mU = mU;
      // update the timestamp of the last change for this character
      characters[socket.hash].lastUpdate = new Date().getTime();
      // notify everyone of the user's updated movement
      io.sockets.in('room1').emit('updatedMovement', characters[socket.hash]);
    });

    // when the user disconnects
    socket.on('disconnect', () => {
      // let everyone know this user left
      io.sockets.in('room1').emit('left', characters[socket.hash]);
      // remove this user from our object
      delete characters[socket.hash];
      socket.leave('room1');
    });
  });
};

module.exports.setupSockets = setupSockets;
