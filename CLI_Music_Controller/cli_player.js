#!/Users/aryankinha/.nvm/versions/node/v20.20.2/bin/node

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path")
const select = require('@inquirer/select').default;
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
    // arr.forEach((song, index) => {
    //     if (song) {
    //         console.log(`${index}: ${song}`);
    //     }
    // });
    return arr;
}

function playSong(song) {
    const scanner = spawn("ffplay", [song]);
}

async function songSelector() {
    const arr = listSong(SONG_DIR);
    const choice = await select({
        message: 'Select a song',
        choices: arr.map((song) => ({
            name: `${song}`,
            value: song
        })),
    });

    playSong(`${SONG_DIR}/${choice}`);
}

songSelector();
// process.stdin.on("data", (data) => {
//     const index = Number(data.toString().trim());

//     playSong(`${SONG_DIR}/${arr[index]}`);
// });