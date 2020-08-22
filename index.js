const app = require("express")();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

let users = [];
let rooms = {};

const randomString = () =>
  Math.random()
    .toString(36)
    .substring(2, 15) +
  Math.random()
    .toString(36)
    .substring(2, 15);

io.on("connection", socket => {
  let nickname = "";
  socket.broadcast.emit("user connect");

  socket.on("chat message", msg => {
    socket.broadcast.emit("chat message", msg);
  });

  socket.on("user typing", name => {
    socket.broadcast.emit("user typing", name);
  });

  socket.on("nickname", name => {
    users.push({ name, socket });
    nickname = name;
    io.emit(
      "users online",
      users.map(user => user.name)
    );
    console.log(users);
  });

  socket.on("invite for private", (user1, user2) => {
    const roomToken = randomString();
    users
      .filter(user => [user1, user2].includes(user.name))
      .forEach(user => {
        user.socket.join(roomToken);
        let otherUsername = user.name === user1 ? user2 : user1;
        io.to(user.socket.id).emit(
          "private room token",
          roomToken,
          otherUsername
        );
      });
  });

  socket.on("private", (roomToken, message) => {
    socket.broadcast.to(roomToken).emit(roomToken, message);
  });

  socket.on("leave private", roomToken => {
    socket.broadcast.to(roomToken).emit(roomToken + "/left", nickname);
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("user disconnect", nickname);
    users = users.filter(user => user.name !== nickname);
    io.emit("users online", users);
  });
});

http.listen(3000, () => console.log("listening on 3000"));
