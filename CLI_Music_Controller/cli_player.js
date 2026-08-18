const { spawn } = require("child_process");
const SONG_DIR = process.env.SONG_DIR;

function listSong(dir_path) {
    const scanner = spawn("ls", [dir_path]);

    scanner.stdout.on("data", (data) => {
        const arr = data.toString().split("\n");

        arr.forEach((song, index) => {
            if (song) {
                console.log(`${index}: ${song}`);
            }
        });
    });
}

function playSong(song) {
    const scanner = spawn("afplay", [song]);
}

listSong(SONG_DIR);

process.stdin.on("data", (data) => {
    const index = Number(data.toString().trim());

    playSong(`${SONG_DIR}/${index}`);
});