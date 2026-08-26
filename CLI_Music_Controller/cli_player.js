#!/Users/aryankinha/.nvm/versions/node/v20.20.2/bin/node

// const { spawn } = require("child_process");
// const fs = require("fs");
// const path = require("path")
// const select = require('@inquirer/select').default;
// const SONG_DIR = path.join(__dirname, "song")

// // function listSong(dir_path) { 
// //     const scanner = spawn("ls", [dir_path]);

// //     scanner.stdout.on("data", (data) => {
// //         const arr = data.toString().split("\n");

// //         arr.forEach((song, index) => {
// //             if (song) {
// //                 console.log(`${index}: ${song}`);
// //             }
// //         });
// //     });
// // }

// function listSong(dir_path) {
//     const arr = fs.readdirSync(dir_path).filter(file => file.endsWith('.mp3'));
//     // arr.forEach((song, index) => {
//     //     if (song) {
//     //         console.log(`${index}: ${song}`);
//     //     }
//     // });
//     return arr;
// }

// function playSong(song) {
//     const scanner = spawn("ffplay", [song]);
// }

// async function songSelector() {
//     const arr = listSong(SONG_DIR);
//     const choice = await select({
//         message: 'Select a song',
//         choices: arr.map((song) => ({
//             name: `${song}`,
//             value: song
//         })),
//     });

//     playSong(`${SONG_DIR}/${choice}`);
// }

// songSelector();
// // process.stdin.on("data", (data) => {
// //     const index = Number(data.toString().trim());

// //     playSong(`${SONG_DIR}/${arr[index]}`);
// // });

/// ------ CLASS CODE


const { spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const SONGS_DIR = path.join(__dirname, 'song');

let songs = [];
let userSelectionIndex = 0;

let currentPlayer = null;

let linesPrinted = 0;

let isPaused = false;

let totalTime = 0;
let currentTime = 0;

let progressInterval = null;

// Used to calculate playback time
let startTime = 0;
let pausedAt = 0;
let totalPausedTime = 0;


// ============================================================
// LIST SONGS
// ============================================================

function listSongs(songDirectoryPath) {

    songs = fs.readdirSync(songDirectoryPath)
        .filter((file) => file.endsWith('.mp3'));

    // Move cursor up to previous render
    if (linesPrinted > 0) {
        process.stdout.write(`\x1b[${linesPrinted}A`);
    }

    let output = '';

    songs.forEach((song, ind) => {

        if (ind === userSelectionIndex) {
            output += `\x1b[2K> ${song}\n`;
        } else {
            output += `\x1b[2K  ${song}\n`;
        }

    });

    // Progress bar line
    output += '\x1b[2K\n';

    // Controls
    output += '\x1b[2K↑/↓ Navigate | n/b Next/Prev & Play | Enter Play | Space Pause | Ctrl+C Exit\n';

    process.stdout.write(output);

    linesPrinted = songs.length + 2;
}


// ============================================================
// GET SONG DURATION USING AFINFO
// ============================================================

function getSongDuration(songFilePath) {

    return new Promise((resolve, reject) => {

        execFile(
            'afinfo',
            [songFilePath],
            (error, stdout, stderr) => {

                if (error) {
                    reject(error);
                    return;
                }

                /*
                    Example afinfo output:

                    estimated duration: 213.456 sec
                */

                const match = stdout.match(
                    /estimated duration:\s*([\d.]+)\s*sec/
                );

                if (!match) {
                    reject(
                        new Error(
                            'Could not find song duration'
                        )
                    );

                    return;
                }

                resolve(
                    parseFloat(match[1])
                );
            }
        );
    });
}


// ============================================================
// FORMAT TIME
// ============================================================

function formatTime(seconds) {

    if (
        !Number.isFinite(seconds) ||
        seconds < 0
    ) {
        seconds = 0;
    }

    seconds = Math.floor(seconds);

    const minutes = Math.floor(
        seconds / 60
    );

    const secs = seconds % 60;

    return (
        String(minutes).padStart(2, '0') +
        ':' +
        String(secs).padStart(2, '0')
    );
}


// ============================================================
// DRAW PROGRESS BAR
// ============================================================

function drawProgressBar() {

    if (!currentPlayer) {
        return;
    }

    const barWidth = 35;

    let progress = 0;

    if (totalTime > 0) {

        progress =
            currentTime / totalTime;
    }

    progress = Math.max(
        0,
        Math.min(1, progress)
    );

    const filled = Math.round(
        barWidth * progress
    );

    const empty =
        barWidth - filled;

    const bar =
        '█'.repeat(filled) +
        '░'.repeat(empty);

    const percentage =
        Math.floor(progress * 100);

    const progressText =
        `${bar} ${percentage}%  ` +
        `${formatTime(currentTime)} / ${formatTime(totalTime)}`;

    /*
        Current terminal:

        song 1
        song 2
        song 3

        progress bar

        controls


        Move up 2 lines to the progress bar.
    */

    process.stdout.write('\x1b[2A');

    process.stdout.write('\x1b[2K');

    process.stdout.write(
        progressText + '\n'
    );

    process.stdout.write('\x1b[2K');

    process.stdout.write(
        '↑/↓ Navigate | n/b Next/Prev & Play | Enter Play | Space Pause | Ctrl+C Exit\n'
    );
}


// ============================================================
// UPDATE CURRENT TIME
// ============================================================

function updateCurrentTime() {

    if (!currentPlayer) {
        return;
    }

    if (isPaused) {
        return;
    }

    /*
        Calculate how many seconds have passed
        since the song started, excluding paused time.
    */

    currentTime =
        (
            Date.now() -
            startTime -
            totalPausedTime
        ) / 1000;

    // Don't go beyond song duration
    if (currentTime >= totalTime) {

        currentTime = totalTime;

        drawProgressBar();

        stopProgress();

        return;
    }

    drawProgressBar();
}


// ============================================================
// START PROGRESS TIMER
// ============================================================

function startProgress() {

    stopProgress();

    progressInterval = setInterval(
        updateCurrentTime,
        500
    );
}


// ============================================================
// STOP PROGRESS TIMER
// ============================================================

function stopProgress() {

    if (progressInterval) {

        clearInterval(progressInterval);

        progressInterval = null;
    }
}


// ============================================================
// PLAY SONG
// ============================================================

async function playSong(songFilePath) {

    // Stop previous timer
    stopProgress();

    // Stop previous VLC
    if (currentPlayer) {

        currentPlayer.kill();

        currentPlayer = null;
    }

    // Reset values
    currentTime = 0;

    totalTime = 0;

    isPaused = false;

    pausedAt = 0;

    totalPausedTime = 0;


    // --------------------------------------------------------
    // Get duration using AFINFO
    // --------------------------------------------------------

    try {

        totalTime =
            await getSongDuration(
                songFilePath
            );

    } catch (error) {

        console.error(
            '\nUnable to get song duration:',
            error.message
        );

        return;
    }


    // --------------------------------------------------------
    // Start VLC
    // --------------------------------------------------------

    currentPlayer = spawn(
        'vlc',
        [
            '-I',
            'dummy',
            '--no-video',
            songFilePath
        ],
        {
            stdio: 'ignore'
        }
    );


    // --------------------------------------------------------
    // Start calculating time
    // --------------------------------------------------------

    startTime = Date.now();

    totalPausedTime = 0;

    isPaused = false;

    startProgress();


    // --------------------------------------------------------
    // VLC exits when song finishes
    // --------------------------------------------------------

    currentPlayer.on('exit', () => {

        stopProgress();

        currentPlayer = null;

        isPaused = false;

        currentTime = 0;

        totalTime = 0;

        pausedAt = 0;

        totalPausedTime = 0;
    });
}


// ============================================================
// PAUSE / RESUME
// ============================================================

function togglePause() {

    if (!currentPlayer) {
        return;
    }


    // --------------------------------------------------------
    // PAUSE
    // --------------------------------------------------------

    if (!isPaused) {

        isPaused = true;

        pausedAt = Date.now();

        /*
            Send SIGSTOP to VLC.

            This freezes the VLC process and therefore
            freezes audio playback.
        */

        currentPlayer.kill('SIGSTOP');

        return;
    }


    // --------------------------------------------------------
    // RESUME
    // --------------------------------------------------------

    if (isPaused) {

        /*
            Calculate how long we were paused.
        */

        const pauseDuration =
            Date.now() - pausedAt;

        totalPausedTime +=
            pauseDuration;

        isPaused = false;

        /*
            Resume VLC.
        */

        currentPlayer.kill('SIGCONT');
    }
}


// ============================================================
// EXIT PLAYER
// ============================================================

function exitPlayer() {

    stopProgress();

    if (currentPlayer) {

        currentPlayer.kill();

        currentPlayer = null;
    }

    process.stdin.setRawMode(false);

    process.stdin.pause();

    // Show cursor
    process.stdout.write(
        '\x1b[?25h'
    );

    // Clear terminal
    if (linesPrinted > 0) {

        process.stdout.write(
            `\x1b[${linesPrinted}A\x1b[J`
        );
    }

    process.exit(0);
}


// ============================================================
// INITIAL SETUP
// ============================================================

// Hide cursor
process.stdout.write(
    '\x1b[?25l'
);

// Show songs
listSongs(SONGS_DIR);

// Enable raw keyboard input
process.stdin.setRawMode(true);

process.stdin.resume();


// ============================================================
// KEYBOARD INPUT
// ============================================================

process.stdin.on('data', (rawUserInput) => {


    // --------------------------------------------------------
    // CTRL + C
    // --------------------------------------------------------

    if (rawUserInput[0] === 0x03) {

        exitPlayer();

        return;
    }


    // --------------------------------------------------------
    // ENTER → PLAY SELECTED SONG
    // --------------------------------------------------------

    if (rawUserInput[0] === 0x0d) {

        const selectedSong =
            songs[userSelectionIndex];

        if (selectedSong) {

            playSong(
                path.join(
                    SONGS_DIR,
                    selectedSong
                )
            );
        }

        return;
    }


    // --------------------------------------------------------
    // SPACE → PAUSE / RESUME
    // --------------------------------------------------------

    if (rawUserInput[0] === 0x20) {

        togglePause();

        return;
    }


    // --------------------------------------------------------
    // N → NEXT SONG
    // --------------------------------------------------------

    if (
        rawUserInput[0] === 0x6e ||
        rawUserInput[0] === 0x4e
    ) {

        userSelectionIndex =
            Math.min(
                songs.length - 1,
                userSelectionIndex + 1
            );

        listSongs(SONGS_DIR);

        const selectedSong =
            songs[userSelectionIndex];

        if (selectedSong) {

            playSong(
                path.join(
                    SONGS_DIR,
                    selectedSong
                )
            );
        }

        return;
    }


    // --------------------------------------------------------
    // B → PREVIOUS SONG
    // --------------------------------------------------------

    if (
        rawUserInput[0] === 0x62 ||
        rawUserInput[0] === 0x42
    ) {

        userSelectionIndex =
            Math.max(
                0,
                userSelectionIndex - 1
            );

        listSongs(SONGS_DIR);

        const selectedSong =
            songs[userSelectionIndex];

        if (selectedSong) {

            playSong(
                path.join(
                    SONGS_DIR,
                    selectedSong
                )
            );
        }

        return;
    }


    // --------------------------------------------------------
    // ARROW KEYS
    // --------------------------------------------------------

    if (
        rawUserInput[0] === 0x1b &&
        rawUserInput[1] === 0x5b
    ) {

        // UP
        if (rawUserInput[2] === 0x41) {

            userSelectionIndex =
                Math.max(
                    0,
                    userSelectionIndex - 1
                );
        }


        // DOWN
        if (rawUserInput[2] === 0x42) {

            userSelectionIndex =
                Math.min(
                    songs.length - 1,
                    userSelectionIndex + 1
                );
        }

        listSongs(SONGS_DIR);
    }
});