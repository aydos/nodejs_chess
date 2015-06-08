# Old ChessBook

This project is bare minimum for building a chess site with nodejs and socket.io.
It uses javascript chess libraries: Chessboard.js, Chess.js, and the Garbo Chess Engine.

Please visit the project site: http://chessbook.org

# installation

Install node.js and npm. Run

    npm install express
    npm install socket.io
    
Put the piece images in img/alpha directory.

Run node with project
    
    node .

# working with GarboChess.js

To work with GarboChess.js I need to understand some other's code. One or two projects use Gary Linscott's 
main codes from boardui.js. I will explain my way. You need to modify for your needs.

Firstly we created a worker

    var g_garbo = new Worker("/js/garbochess.js");

To check messages from worker, we need an onmessage function

    g_garbo.onmessage = function (e) {
       ...
    }

And then send messages to worker

    g_garbo.postMessage("position " + game.fen());
    g_garbo.postMessage("search 800");
    
First line sets up a position, second line says "Solve it in 800 ms."

And I check messages from worker like this:

    g_garbo.onmessage = function (e) {
        move = { from: e.data[0]+e.data[1], to: e.data[2]+e.data[3] };
        if (e.data[4]) {
            move.promotion = e.data[4];
        }
        g_garbo.terminate();
        game.move(move);
        board.position(game.fen());
        socket.emit("move", {move: move, fen: game.fen()});
    }

CAUTION: Since I modified GarboChess.js (latest "Test Harness" part) I only get the best move as message.
But original GarboChess.js send more message if you like it analyze the position. You may need something like that:

    g_garbo.onmessage = function (e) {
        if (e.data.match("^pv") == "pv") {
        } else if (e.data.match("^sam") == "sam") {
        } else if (e.data.match("^message") == "message") {
        } else {
            move = { from: e.data[0]+e.data[1], to: e.data[2]+e.data[3] };
            if (e.data[4]) {
                move.promotion = e.data[4];
            }
            g_garbo.terminate();
            game.move(move);
            board.position(game.fen());
            socket.emit("move", {move: move, fen: game.fen()});
        }        
    }

