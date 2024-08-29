const { getIo } = require("../config/socketSetup");

function socketVideoDSK() {
  const io = getIo();

  io.on("connection", (socket) => {
    socket.on("session-start", async (data) => {
      console.log(data);
    });
  });
}

module.exports = socketVideoDSK;
