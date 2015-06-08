/*

OLD CHESS BOOK (http://chessbook.org)
Fahri Aydos (http://aydos.com)

v0.0 2015 05 29
- ilk code

v0.1 2015 06 04
- sitede yayınlandı

v0.2 2015 06 08
- github'a kondu

*/

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io').listen(http);

http.listen(8081);

app.use(express.static(__dirname + '/client'));

var wait = "";
var users = {};
var usercnt = 0;
var games = {};
var gamecnt = 0;


io.on("connection", function (socket) {

    // generate new user add to users list
    var user = newUser(socket);

    // save name for socket session
    socket.name = user.name;

    // send back user data and broadcats counters
    socket.emit("user", {user: users[socket.name]});
    broadcastCounts();

    // ==========================================
    // socket functions

    // user disconnect
    socket.on("disconnect", function () {
        deleteUser(socket.name);
        broadcastCounts();
    });

    // user want to play againts computer
    socket.on("play computer", function () {
        var id = newGame(socket.name, "computer");
        broadcastCounts();
        broadcastGameInfo(id);
    });

    // user want to play againts human
    socket.on("play human", function () {
        if (wait === "") {
            wait = socket.name;
            users[socket.name].status = "wait";
            socket.emit("wait", {user: users[socket.name]});
        } else {
            var opponent = wait;
            wait = "";
            var id = newGame(opponent, socket.name);
            broadcastCounts();
            broadcastGameInfo(id);
        }
    });

    // user dont want to wait human opponent
    socket.on("cancel wait", function () {
        if (wait === socket.name) {
            wait = "";
        }
        users[socket.name].status = "idle";
        socket.emit("user", {user: users[socket.name]});
    });

    socket.on("watch game", function () {
        var keys = Object.keys(games);
        if (keys.length > 0) {
            var id = keys[Rand(0, keys.length-1)];
            games[id].watchers.push(socket.name);
            users[socket.name].status = "watch";
            users[socket.name].game = id;
            socket.emit("user", {user: users[socket.name]});
            socket.emit("watch game", {fen : games[id].fen});
            broadcastGameInfo(id);
        }
    });

    socket.on("cancel watch", function () {
        var id = users[socket.name].game;
        if (games[id]) {
            var index = games[id].watchers.indexOf(socket.name);
            if (index > -1) {
                games[id].watchers.splice(index, 1);
            }
            broadcastGameInfo(id);
        }
        users[socket.name].status = "idle";
        users[socket.name].game = "";
        socket.emit("user", {user: users[socket.name]});
    });

    socket.on("finish game", function (data) {
        id = users[socket.name].game;
        finishGame(id, data);
        broadcastCounts();
    });

    socket.on("move", function (data) {
        var opponent = users[socket.name].opponent;
        if (opponent != "computer") {
            io.to(users[opponent].id).emit("move", {move: data.move});
        }
        var id = users[socket.name].game;
        games[id].fen = data.fen;
        for (var i=0; i<games[id].watchers.length; i++) {
            io.to(users[games[id].watchers[i]].id).emit("move", {move: data.move});
        };
    });

});

function broadcastCounts() {
    io.sockets.emit("counts", {usercnt: usercnt, gamecnt: gamecnt});
}


function broadcastGameInfo(id) {
    var info = {
        white : games[id].white,
        black : games[id].black,
        watchers : games[id].watchers.length
    }
    // send to white
    io.to(users[games[id].white].id).emit("game info", info);
    // send to black
    if (games[id].black != "computer") {
        io.to(users[games[id].black].id).emit("game info", info);
    }
    // send to watchers
    for (var i=0; i<games[id].watchers.length; i++) {
        if (users[games[id].watchers[i]]) {
            io.to(users[games[id].watchers[i]].id).emit("game info", info);
        }
    }
}

// generate new user add to users list
function newUser(socket) {
    // generate non exists name
    var name = hexRand();
    while (users[name]) {
        name = hexRand();
    }
    // new user
    var user = {
        name : name,
        status : "idle", // idle, wait, play, watch
        game : "",
        color : "",
        opponent : "",
        id : socket.id
    }
    // add to users list
    users[user.name] = user;
    usercnt++;
    return user;
}


function deleteUser(name) {
    var id = users[name].game;
    var status = users[name].status
    if (status === "play") {
        finishGame(id, name + " disconnected", name);
    } else if (status === "watch") {
        if (games[id] != undefined) {
            var index = games[id].watchers.indexOf(name);
            if (index > -1) {
                games[id].watchers.splice(index, 1);
            }
            broadcastGameInfo(id);
        }
    }
    if (wait === name) {
        wait = "";
    }
    delete(users[name]);
    usercnt--;
}


function cancelWatch() {
    var id = users[socket.name].game;
    if (games[id] != undefined) {
        var index = games[id].watchers.indexOf(name);
        if (index > -1) {
            games[id].watchers.splice(index, 1);
        }
        broadcastGameInfo(id);
    }
    users[socket.name].status = "idle";
    users[socket.name].game = "";
    users[socket.name].color = "";
    users[socket.name].opponent = "";
}


function newGame(white, black) {
    var id = hexRand();
    while (games[id] != undefined) {
        id = hexRand();
    }
    var game = {
        id : id,
        white : white,
        black : black,
        fen : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        watchers : []
    }
    games[id] = game;
    gamecnt++;
    users[white].status = "play";
    users[white].game = game.id;
    users[white].color = "white";
    users[white].opponent = black;
    io.to(users[white].id).emit("start game", {user: users[white]});
    if (black != "computer") {
        users[black].status = "play";
        users[black].game = game.id;
        users[black].color = "black";
        users[black].opponent = white;
        io.to(users[black].id).emit("start game", {user: users[black]});
    }
    return id;
}


function finishGame(id, data) {
    if (games[id] === undefined) {
        return;
    }
    // save users info
    var white = games[id].white;
    var black = games[id].black;
    var watchers = games[id].watchers;

    // delet game
    delete(games[id]);
    gamecnt--;

    var why = "";
    if (data.draw == 1) {
        why = "Draw";
    } else if (data.white == 1) {
        why = "White ("+ white +") won.";
    } else if (data.black == 1) {
        why = "Black ("+ black +") won.";
    } else if (data.resigned === white) {
        why = "Black ("+ black +") won. " + white + " resigned.";
    } else if (data.resigned === black) {
        why = "White ("+ white +") won. " + white + " resigned.";
    } else if (data.disconnected === white) {
        why = "Black ("+ black +") won. " + white + " disconnected.";
    } else if (data.disconnected === black) {
        why = "White ("+ white +") won. " + white + " disconnected.";
    }

    // do user staff
    if (white != data.disconnected) {
        users[white].status = "idle";
        users[white].game = "";
        users[white].color = "";
        users[white].opponent = "";
        io.to(users[white].id).emit("finish game", {user: users[white], why: why});
    }
    if (black != "computer" && black != data.disconnected) { // if black not disconnected
        users[black].status = "idle";
        users[black].game = "";
        users[black].color = "";
        users[black].opponent = "";
        io.to(users[black].id).emit("finish game", {user: users[black], why: why});
    }
    watchers.forEach( function(name) {
        if(users[name] != undefined) {
            users[name].status = "idle";
            users[name].game = "";
            users[name].color = "";
            users[name].opponent = "";
            io.to(users[name].id).emit("finish game", {user: users[name], why: why});
        }
    });
}

// Random utilities

function Rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hexRand() {
    rand = "";
    chrs = "0123456789ABCDEF"
    for (var i=0; i<8; i++) {
        rand = rand + chrs[Rand(0,15)];
    };
    return rand;
}

