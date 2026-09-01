process.stdin.setRawMode(true)

process.stdin.on('data', (rawUserInput) => {

    if (rawUserInput[0] === 0x03) {
        process.stdin.setRawMode(false)
        process.stdin.pause()
        process.exit(0)
    }

    console.log('Key:', rawUserInput, rawUserInput.toString(), rawUserInput.toString().charCodeAt(0))
})
