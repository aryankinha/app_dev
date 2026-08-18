const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path")
const SONG_DIR = path.join(__dirname, "song")

// function listSong(dir_path) { 
//     const scanner = spawn("ls", [dir_path]);

//     scanner.stdout.on("data", (data) => {
//         const arr = data.toString().split("\n");

//         arr.forEach((song, index) => {
//             if (song) {
//                 console.log(`${index}: ${song}`);
//             }
//         });
//     });
// }

function listSong(dir_path) {
    const arr = fs.readdirSync(dir_path).filter(file => file.endsWith('.mp3'));
    arr.forEach((song, index) => {
        if (song) {
            console.log(`${index}: ${song}`);
        }
    });
    return arr;
}

function playSong(song) {
    const scanner = spawn("ffplay", [song]);
}

const arr = listSong(SONG_DIR);

process.stdin.on("data", (data) => {
    const index = Number(data.toString().trim());

    playSong(`${SONG_DIR}/${arr[index]}`);
});