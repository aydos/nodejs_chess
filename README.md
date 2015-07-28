# NodeJS Chess

This project is bare minimum for building a chess site with nodejs and socket.io.
It uses javascript chess libraries: Chessboard.js, Chess.js, and the Garbo Chess Engine.

Please visit the project site: http://chessbook.org

## Installation

Download the project files and unzip to a directory.

Install node.js and npm. Run below commands within the same directory.

    npm install express
    npm install socket.io
    
Put the piece images in client/img/alpha directory. Or you can modify client/js/oldchessbook.js file.

Run node with project.
    
    node .

## Features

* Guest can play againts computer (GarboChess.js, 800ms)
* Guest can play againts another random guest
* Guest can watch random game

## Not Supported

Below features are not and will not supported. You must implement them.
* Chess game by time
* Draw detection by repetition or by 50 moves
* Registered users
* Saving chess games
* ELO or other rank system
* Play againts diferrent levels of computer

# Working with GarboChess.js

To work with GarboChess.js I need to understand some other programmers code. One or two projects use Gary Linscott's 
main codes from boardui.js. I figured it out how to include only garbochess.js and not include boardui.js (it is a board ui, and we dont need it). I will explain my way. You need to modify for your needs.

First we created a worker:
```js
var g_garbo = new Worker("/js/garbochess.js");
```
To check messages from worker, we need an onmessage function:
```js
g_garbo.onmessage = function (e) {
   ...
}
```
And then send messages to worker:
```js
g_garbo.postMessage("position " + game.fen());
g_garbo.postMessage("search 800");
```
First line sets up a position, second line says "Solve it in 800 ms."

And I check messages from worker like this:
```js
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
```
CAUTION: Since I modified GarboChess.js (latest "Test Harness" part) I only get the best move as message.
But original GarboChess.js send more messages if you like it analyze the position. Then you may need something like that:
```js
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
```
