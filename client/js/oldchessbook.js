
// chess game variables
var socket, user, game, board, cfgplay, cfgwatch;

// jquery variables
var $username, $usercnt, $gamecnt, $gameinfo;
var $hider, $status, $askplay;
var $turnup, $turndown;
var $playerup, $playerdown;
var $message, $cancel;
var $watchgames;
var $watcherinfo;
var $aydos, $about;

// main function
$(document).ready(function() {
    socket = io.connect();
    //user = "";
    //game = new Chess();
    cfgplay = {
        draggable: true,
        position: "start",
        onDragStart: onDragStart,
        dropOffBoard: "snapback",
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: "img/alpha/{piece}.png"
    };
    cfgwatch = {
        position: "start",
        pieceTheme: "img/alpha/{piece}.png"
    };
    board = new ChessBoard("board", cfgwatch);

    $username = $("#username");
    $usercnt = $("#usercnt");
    $gamecnt = $("#gamecnt");
    $gameinfo = $("#gameinfo");
    $hider = $("#hider");
    $status = $("#status");
    $askplay = $("#askplay");
    $turnup = $("#turnup");
    $turndown = $("#turndown");
    $watchgames = $("#watchgames");
    $playerup = $("#playerup");
    $playerdown = $("#playerdown");
    $message = $("#message");
    $cancel = $("#cancel");
    $watcherinfo = $("#watcherinfo");
    $aydos = $("#aydos");
    $about = $("#about");

    $(window).bind("resize", initWindow);
    $(document).bind("keydown", keyDown);

    initWindow();
    clickFunctions();
    socketFunctions();

    askplay();
});


function socketFunctions() {

    socket.on("user", function (data) {
        user = data.user;
        $username.html(user.name);
        if (user.status == "idle") {
            askplay();
        }
    });

    socket.on("counts", function (data) {
        $usercnt.html(data.usercnt);
        $gamecnt.html(data.gamecnt);
        if (data.gamecnt == 0) {
            $watchgames.prop("disabled", true);
        } else {
            $watchgames.prop("disabled", false);
        }
    });

    socket.on("start game", function (data) {
        $hider.fadeOut("fast");
        $status.fadeOut("fast");
        user = data.user;
        game = new Chess();
        board = new ChessBoard("board", cfgplay);
        board.orientation(user.color);
        if(user.color == "white") {
            $turnup.removeClass("turnwhite").addClass("turnblack");
            $turndown.removeClass("turnblack").addClass("turnwhite");
        } else {
            $turnup.removeClass("turnblack").addClass("turnwhite");
            $turndown.removeClass("turnwhite").addClass("turnblack");
        }
        showTurn();
    });

    socket.on("watch game", function (data) {
        $hider.fadeOut("fast");
        $status.fadeOut("fast");
        game = new Chess(data.fen);
        board = new ChessBoard("board", cfgwatch);
        board.position(data.fen);
        board.orientation("white");
        $turnup.removeClass("turnwhite").addClass("turnblack");
        $turndown.removeClass("turnblack").addClass("turnwhite");
        showTurn();
    });

    socket.on("finish game", function (data) {
        user = data.user;
        showStatus(data.why, "OK");
    });

    socket.on("wait", function (data) {
        user = data.user;
        showStatus("Waiting for opponent", "Cancel");
    });

    socket.on("game info", function (data) {
        if (board.orientation() === "white") {
            $playerup.html(data.black);
            $playerdown.html(data.white);
        } else {
            $playerup.html(data.white);
            $playerdown.html(data.black);
        }
        if (data.watchers) {
            $watcherinfo.html("Watcher this game:<br /><span id='watchercnt'>"+data.watchers + "</span>");
        } else {
            $watcherinfo.html("");
        }
    });

    socket.on("move", function (data) {
        game.move(data.move);
        board.position(game.fen());
        showTurn();
    });

}

function initWindow() {
    var w = document.body.clientWidth;
    var h = document.body.clientHeight;
    
    var gh = h - $("#menu").outerHeight() - 24;
    var gw = gh + 400;
    $("#game").css({width: gw, height: gh});
    $("#board").css({width: gh, height: gh});
    $("#infoup").css({height: gh});
    $hider.css({width: 2*w, height: 2*h, "margin-left": (0-w), "margin-top": (0-h)});

    board.resize();
}

function keyDown(e) {
    if (e.keyCode == 27) {      // esc
        e.preventDefault();
        if (user.status === "play") {
            if ($status.is(':visible')) { // cancel resign
                $hider.fadeOut("fast");
                $status.fadeOut("fast");
            } else {                           // ask resign
                showStatus("Do you resign the game?", "Yes");
            }
        } else if (user.status === "watch") {  // leave watching game
            socket.emit("cancel watch");
        }
    }
}

function showStatus(message, button) {
    $hider.fadeIn("fast");
    $status.fadeIn("fast");
    $message.html(message);
    $cancel.html(button);
}

function showTurn() {
    var turn = game.turn() === "w" ? "white" : "black";
    if (turn === board.orientation()) {
        $turnup.hide();
        $turndown.show();
    } else {
        $turnup.show();
        $turndown.hide();
    }
}

function clickFunctions() {

    $("#btnabout").click(function() {
        $hider.fadeIn("fast");
        $about.fadeIn("fast");
    });

    $("#btnaydos").click(function() {
        $hider.fadeIn("fast");
        $aydos.fadeIn("fast");
    });

    $("#closeabout").click(function() {
        $hider.fadeOut("fast");
        $about.fadeOut("fast");
    });

    $("#closeaydos").click(function() {
        $hider.fadeOut("fast");
        $aydos.fadeOut("fast");
    });

    askplay = function() {
        $hider.fadeIn("fast");
        $askplay.fadeIn("fast");
    };

    $("#playhuman").click(function() {
        $hider.fadeOut("fast");
        $askplay.fadeOut("fast");
        socket.emit("play human");
    });

    $("#playcomputer").click(function() {
        $hider.fadeOut("fast");
        $askplay.fadeOut("fast");
        socket.emit("play computer");
    });

    $("#watchgames").click(function() {
        $hider.fadeOut("fast");
        $askplay.fadeOut("fast");
        socket.emit("watch game");
    });

    $cancel.click(function() {
        $status.fadeOut("fast");
        $askplay.fadeIn("fast");
        if ($cancel.html() === "Cancel") {
            socket.emit("cancel wait");
        }
        if ($cancel.html() === "OK") {
            ;
        }
        if ($cancel.html() === "Yes") {
            var status = {
                draw : 0,
                white : 0,
                black : 0,
                resigned : user.name,
                disconnected : ""
            };
            socket.emit("finish game", status);
        }
    });

}


// ====================================================
// Integration between chessboard.js and chess.js

// do not pick up pieces if the game is over
// only pick up pieces for the side to move
var onDragStart = function(source, piece, position, orientation) {
    if (game.game_over() === true || (game.turn() != piece[0]) ) {
        return false;
    }
    if (game.turn() === "w" && user.color === "black") {
        return false;
    }
    if (game.turn() === "b" && user.color === "white") {
        return false;
    }
};

var onDrop = function(source, target) {
    // see if the move is legal
    var move = game.move({
        from: source,
        to: target,
        promotion: "q"
    });
    // illegal move
    if (move === null) return "snapback";

    // make the move
    socket.emit("move", {move: move.san, fen: game.fen()})

    // if play againts computer
    if (user.opponent === "computer") {
        makeComputerMove();
    }

    updateStatus();
};

// update the board position after the piece snap 
// for castling, en passant, pawn promotion
var onSnapEnd = function() {
    board.position(game.fen());
    showTurn();
};

var updateStatus = function() {
    var status = {
        draw : 0,
        white : 0,
        black : 0,
        resigned : "",
        disconnected : ""
    };
    /*var moveColor = 'White';
    if (game.turn() === 'b') {
        moveColor = 'Black';
    }*/
    // checkmate?
    if (game.in_checkmate() === true) {
        if (game.turn() === 'w') {
            status.black = 1;
        } else {
            status.white = 1;
        }
        //status = 'Game over, ' + moveColor + ' is in checkmate.';
        socket.emit("finish game", status);
    }
    // draw?
    else if (game.in_draw() === true) {
        status.draw = 1;
        socket.emit("finish game", status);
    }
    // game still on
    else {
        /*status = moveColor + ' to move';
        // check?
        if (game.in_check() === true) {
            status += ', ' + moveColor + ' is in check';
        }*/
    }
};

var makeComputerMove = function() {
    var possibleMoves = game.moves();

    // game over
    if (possibleMoves.length === 0) return;

    /*
    // Random Move
    var randomIndex = Math.floor(Math.random() * possibleMoves.length);
    game.move(possibleMoves[randomIndex]);
    board.position(game.fen());
    socket.emit("move", {move: possibleMoves[randomIndex], fen: game.fen()})
    */

    // GarboChess
    var g_garbo = new Worker("/js/garbochess.min.js");
    g_garbo.onmessage = function (e) {
        move = { from: e.data[0]+e.data[1], to: e.data[2]+e.data[3] };
        if (e.data[4]) {
            move.promotion = e.data[4];
        }
        g_garbo.terminate();
        game.move(move);
        board.position(game.fen());
        showTurn();
        socket.emit("move", {move: move, fen: game.fen()});
        updateStatus();
    }
    g_garbo.postMessage("position " + game.fen());
    g_garbo.postMessage("search 800");

};

