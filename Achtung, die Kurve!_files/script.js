// players
let players = {
    fred: { powerup: { toClear: [] }, score: 0, ready: false },
    greenlee: { powerup: { toClear: [] }, score: 0, ready: false },
    pinkney: { powerup: { toClear: [] }, score: 0, ready: false },
    bluebell: { powerup: { toClear: [] }, score: 0, ready: false },
    willem: { powerup: { toClear: [] }, score: 0, ready: false },
    greydon: { powerup: { toClear: [] }, score: 0, ready: false },
}

let achtung = {
    gamemode: 1, //  0 = arcade, 1 = classic
    startScreen: true, // are we on the start screen?
    gameRunning: false, // are we playing?
    gameEnded: true, // are noone alive?
    winner: false, // do we have a winner?
    sides: 0, // can all players go out of screen and come out the other side
    clearSides: 0, // to clear timeone if leftover time from last round
    ghostMode: 0, // all trails drawn invisible (black) but still lethal
    clearGhost: 0, // to clear ghost timeout if leftover from last round
    playing: [], // who's playing
    powerups: [
        "g_slow",
        "g_fast",
        "g_thin",
        "g_robot",
        "g_side",
        "g_invisible",
        "r_slow",
        "r_fast",
        "r_thick",
        "r_robot",
        "r_reverse",
        "b_clear",
        "b_more",
        "b_sides",
        "o_random",
        "r_shots",  // Serve shots to others
        "g_jesus",  // Jesus take the wheel
        "r_circus",  // <-- Circus Tent Sabotage
        "b_ghost"    // <-- Ghost Mode: ALL trails invisible (but lethal) for 2s
    ],
    powerupsOnScreen: [], // what powerups are on screen now
}

// variables
let canvasID,
    UIcanvas = document.querySelector("#ui_canvas"), // ui canvas
    dotsCanvas = document.querySelector("#dots_canvas"), // canvas for player dots
    trailsHitboxCanvas = document.querySelector("#trails_hitbox_canvas"), // canvas for player trails
    powerupVisualCanvas = document.querySelector("#powerup_visual_canvas"), // canvas for powerup icons
    powerupHitboxCanvas = document.querySelector("#powerup_hitbox_canvas"), // canvas for powerup hitboxes
    ctxUI = UIcanvas.getContext("2d"),
    ctxDO = dotsCanvas.getContext("2d"),
    ctxTH = trailsHitboxCanvas.getContext("2d"),
    ctxPV = powerupVisualCanvas.getContext("2d"),
    ctxPH = powerupHitboxCanvas.getContext("2d"),
    yellow = getComputedStyle(document.documentElement).getPropertyValue(`--yellow`), // colors
    green = getComputedStyle(document.documentElement).getPropertyValue(`--greenlee`),
    greent = getComputedStyle(document.documentElement).getPropertyValue(`--greenlee-t`),
    red = getComputedStyle(document.documentElement).getPropertyValue(`--fred`),
    redt = getComputedStyle(document.documentElement).getPropertyValue(`--fred-t`),
    blue = getComputedStyle(document.documentElement).getPropertyValue(`--blue`),
    bluet = getComputedStyle(document.documentElement).getPropertyValue(`--blue-t`),
    tFrame = 0, // cur frame in draw
    powerupProb = 0.01, // in percent
    bridgeProb = 0.007, // in percent
    bridgeSize = 12, // in frames
    turnSpeed = 0.06, // in radians per frame
    w,
    h,
    w100th,
    h100th,
    moveSpeed,
    playerSize,
    hitboxSize,
    borderWidth,
    iconSize // to be set in newSize()

let activeCircuses = [];

// when resizing
window.addEventListener("resize", newSize)

// ============================================================
// BACHELOR PARTY EASTER EGG — Fred (the groom)
// ============================================================

// Photo for Fred's worm head — replace src with actual photo URL or base64
const fredPhoto = new Image()
fredPhoto.src = "Achtung, die Kurve!_files/fred_photo.jpg" // <-- PUT GROOM PHOTO HERE (jpg/png URL or base64)

// Ghost powerup custom image
const ghostPowerupImage = new Image()
ghostPowerupImage.src = "Achtung, die Kurve!_files/jager.jpg" // <-- PUT GHOST POWERUP IMAGE HERE

// Death audio clips — replace filenames with your actual mp3 files
const fredDeathClips = [
    new Audio("Achtung, die Kurve!_files/death1.mp3"), 
    new Audio("Achtung, die Kurve!_files/death2.mp3")
]

function playFredDeathSound() {
    const clip = fredDeathClips[Math.floor(Math.random() * fredDeathClips.length)]
    clip.currentTime = 0
    clip.play().catch(() => {}) // catch autoplay errors gracefully
}

// ============================================================

function newSize() {
    // update canvas sizes and variable sizes to fit new size
    const dpr = Math.min(window.devicePixelRatio, 2)
    w = Math.round(UIcanvas.getBoundingClientRect().width * dpr)
    h = Math.round(UIcanvas.getBoundingClientRect().height * dpr)
    UIcanvas.width = w
    UIcanvas.height = h
    dotsCanvas.width = w
    dotsCanvas.height = h
    trailsHitboxCanvas.width = w
    trailsHitboxCanvas.height = h
    powerupVisualCanvas.width = w
    powerupVisualCanvas.height = h
    powerupHitboxCanvas.width = w
    powerupHitboxCanvas.height = h
    w100th = w / 100 // 1 percent of canvas width
    h100th = h / 100 // 1 percent of canvas height
    moveSpeed = w100th * 0.18 // in pixels per frame
    playerSize = w100th * 0.7 // in pixels
    hitboxSize = playerSize / 1.8 // in pixels
    borderWidth = w100th / 2 // in pixels
    iconSize = w100th * 2 // in pixels

    init() // restart
}

function init() {
    achtung.powerupsOnScreen = [] // clear powerups on screen
    clearTimeout(achtung.clearSides) // clear timeout if sides powerup leftover time from last round
    achtung.sides = 0 // reset sides
    clearTimeout(achtung.clearGhost) // clear ghost timeout if leftover
    achtung.ghostMode = 0 // reset ghost mode
    activeCircuses = []; // Clear active obstacles

    for (const player in players) {
        // clear timeout if powerup leftover time from last round
        for (let i = 0; i < players[player].powerup.toClear.length; i++) {
            clearTimeout(players[player].powerup.toClear[i])
        }

        // reset players object to default values before starting a new round
        players[player].x = 0
        players[player].y = 0
        players[player].dir = 0
        players[player].turnL = false
        players[player].turnR = false
        players[player].color = getComputedStyle(document.documentElement).getPropertyValue(`--${player}`) // colors from css :root object
        players[player].alive = true
        players[player].winner = false
        players[player].bridge = false
        players[player].bridgeFrame = 0
        players[player].powerup = {} // contains powerup values
        players[player].powerup.size = 1
        players[player].powerup.robot = 0
        players[player].powerup.reverse = 0
        players[player].powerup.speed = 1
        players[player].powerup.invisible = 0
        players[player].powerup.side = 0
        players[player].powerup.wobble = 0    // bachelor easter egg: shots powerup
        players[player].powerup.jesus = 0     // jesus take the wheel powerup
        players[player].powerup.jesusDir = 0  // locked direction for jesus
        players[player].powerup.powerupArray = []
        players[player].powerup.toClear = [] // to clear timeout at the end of rounds if leftover time
    }

    // clear everything
    ctxTH.clearRect(0, 0, w, h)
    ctxUI.clearRect(0, 0, w, h)
    ctxDO.clearRect(0, 0, w, h)
    ctxPH.clearRect(0, 0, w, h)
    ctxPV.clearRect(0, 0, w, h)

    // draw yellow border
    ctxDO.lineWidth = borderWidth
    ctxDO.strokeStyle = yellow
    ctxDO.strokeRect(borderWidth / 2, borderWidth / 2, h - borderWidth, h - borderWidth)

    calcRandomStartPos() // calc random start positions
    calcRandomStartDir() // calc random start directions
    drawGameUI() // draw ui
    drawStart() // draw players at start so they can see where they're going
}

document.addEventListener("keydown", (e) => {
    // update players turning to true if turning
    for (const player in players) {
        if (!players[player].alive) continue // if player not alive; skip
        if (e.code == players[player].keyL) {
            players[player].turnL = true
        }
        if (e.code == players[player].keyR) {
            players[player].turnR = true
        }
    }

    // if keydown == escape, go to start page
    if (e.code == "Escape") {
        achtung.startScreen = true
        achtung.gameEnded = true
        achtung.gameRunning = false
        startPage.style.display = "block"
        window.cancelAnimationFrame(canvasID)
        for (const player in players) {
            players[player].score = 0
        }
        init()
    }
})

document.addEventListener("keyup", (e) => {
    // update players turning to false when keyup
    for (const player in players) {
        if (!players[player].alive) continue // if player not alive; skip
        if (e.code == players[player].keyL) {
            players[player].turnL = false
        }
        if (e.code == players[player].keyR) {
            players[player].turnR = false
        }
    }
})

document.addEventListener("keypress", (e) => {
    if (e.code == "Space") {
        pressSpace()
    }
})

function pressSpace() {
    let playingC = 0
    for (const player in players) {
        if (players[player].ready) playingC++
    }

    if (achtung.startScreen) {
        if (playingC >= 2) {
            // start game
            for (const player in players) {
                if (players[player].active && !players[player].ready) {
                    resetPlayer(document.querySelector(`.player_wrapper.${player}`))
                }
            }
            achtung.startScreen = false
            achtung.gameEnded = true
            startPage.style.display = "none"
            init()
        }
    }

    if (!achtung.gameEnded) {
        if (!achtung.gameRunning) {
            // resume game
            achtung.gameRunning = true
            window.requestAnimationFrame(draw)
        } else {
            // pause game
            achtung.gameRunning = false
            window.cancelAnimationFrame(canvasID)
        }
    } else {
        // restart game
        if (achtung.winner) {
            achtung.winner = false
            achtung.startScreen = true
            achtung.gameEnded = true
            achtung.gameRunning = false
            startPage.style.display = "block"
            window.cancelAnimationFrame(canvasID)
            for (const player in players) {
                players[player].score = 0
            }
            init()
        } else {
            if (playingC >= 2) {
                achtung.gameEnded = false
                achtung.gameRunning = false
                init()
            }
        }
    }
}

// draw start position so players know where they're going
function drawStart() {
    for (const player in players) {
        if (!players[player].ready) continue

        // draw player dot
        ctxDO.fillStyle = yellow
        ctxDO.beginPath()
        ctxDO.arc(players[player].x, players[player].y, (playerSize / 2 - 0.1) * players[player].powerup.size, 0, r2d(360), true)
        ctxDO.fill()

        // draw player trail
        ctxTH.fillStyle = players[player].color
        ctxTH.save()
        ctxTH.translate(players[player].x, players[player].y)
        ctxTH.rotate(players[player].dir - r2d(270))
        ctxTH.fillRect(
            (-playerSize / 2) * players[player].powerup.size,
            0,
            playerSize * players[player].powerup.size,
            playerSize * 2 * players[player].powerup.size
        )
        ctxTH.restore()
    }
}

// main loop
function draw() {
    canvasID = window.requestAnimationFrame(draw) // to pause: cancelAnimationFrame(CanvasID)
    tFrame++ // increment tFrame

    // Bachelor easter egg: randomly swap Fred's controls for 0.5s (roughly once every ~25s at 60fps)
    if (players.fred && players.fred.alive && players.fred.ready) {
        if (Math.random() < 0.001) {
            players.fred.powerup.reverse++
            setTimeout(() => { if (players.fred) players.fred.powerup.reverse-- }, 500)
        }
    }

    // clear
    ctxTH.clearRect(h, 0, w - h, h)
    ctxDO.clearRect(0, 0, w, h)
    ctxDO.fillStyle = "#000000"
    ctxDO.fillRect(h, 0, w - h, h)

    // draw yellow border
    ctxDO.lineWidth = borderWidth
    ctxDO.strokeStyle = "#000000"
    ctxDO.strokeRect(borderWidth / 2, borderWidth / 2, h - borderWidth, h - borderWidth)
    if (achtung.sides != 0) ctxDO.strokeStyle = `rgba(255, 255, 0, ${Math.abs((tFrame % 40) - 20) / 20})`
    else ctxDO.strokeStyle = yellow // if sides, border flickers
    ctxDO.strokeRect(borderWidth / 2, borderWidth / 2, h - borderWidth, h - borderWidth)

    // spawn new powerup if arcade mode and math.random() < powerup probability
    if (achtung.gamemode == 1) if (Math.random() < powerupProb) powerupSpawner()

    // 1. Process Flying Circus Tents
    for (let i = activeCircuses.length - 1; i >= 0; i--) {
        let tent = activeCircuses[i];
        tent.x += tent.vx;
        tent.y += tent.vy;

        // Draw Circus Tent Graphics on Dots Canvas (so it moves over everything smoothly)
        ctxDO.save();
        ctxDO.beginPath();
        ctxDO.arc(tent.x, tent.y, tent.radius, 0, Math.PI * 2);
        ctxDO.fillStyle = "rgba(220, 40, 40, 0.85)"; // Red Base
        ctxDO.fill();
        
        // Circus White Stripes Accent
        ctxDO.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctxDO.lineWidth = 6;
        ctxDO.setLineDash([8, 8]);
        ctxDO.stroke();
        ctxDO.restore();

        // Check if any player hits the moving tent
        for (const player in players) {
            // Ignore the player who spawned the tent (Immunity!)
            if (player === tent.owner) continue;

            if (!players[player].ready || !players[player].alive) continue;
            let distance = Math.hypot(players[player].x - tent.x, players[player].y - tent.y);
            
            // If hit box radius collides
            if (distance < tent.radius + ((playerSize / 2) * players[player].powerup.size)) {
                if (players[player].powerup.jesus == 0) {
                    givePoints(players[player]);
                }
            }
        }

        // Clean up out-of-bounds tents safely
        if (tent.x < -100 || tent.x > h + 100 || tent.y < -100 || tent.y > h + 100) {
            activeCircuses.splice(i, 1);
        }
    }

    // --- LAG COMPENSATION HACK ---
    let aliveCount = 0;
    for (const p in players) {
        if (players[p].ready && players[p].alive) {
            aliveCount++;
        }
    }
    // Boost speed globally based on how many players are alive.
    // Tweak 0.10 if it feels too fast/slow.
    let lagCompensation = 1 + (aliveCount * 0.07); 
    let currentMoveSpeed = moveSpeed * lagCompensation;
    let currentTurnSpeed = turnSpeed * lagCompensation;
    // -----------------------------

    // loop through players and draw them
    for (const player in players) {
        if (!players[player].ready) continue // continue loop if player not playing

        // player pos
        let prevprevPosX = players[player].x - mathCos(players[player].dir) * currentMoveSpeed * players[player].powerup.speed,
            prevprevPosY = players[player].y - mathSin(players[player].dir) * currentMoveSpeed * players[player].powerup.speed,
            prevPosX = players[player].x,
            prevPosY = players[player].y,
            nextPosX = players[player].x + mathCos(players[player].dir) * currentMoveSpeed * players[player].powerup.speed,
            nextPosY = players[player].y + mathSin(players[player].dir) * currentMoveSpeed * players[player].powerup.speed

        // draw player dot
        if (players[player].powerup.reverse == 0) {
            if (players[player].powerup.side == 0) {
                ctxDO.fillStyle = yellow
            } else ctxDO.fillStyle = `rgba(255, 255, 0, ${Math.abs((tFrame % 40) - 20) / 20})` // flicker dot if side powerup
        } else {
            if (players[player].powerup.side == 0) {
                ctxDO.fillStyle = blue
            } else ctxDO.fillStyle = `rgba(0, 0, 255, ${Math.abs((tFrame % 40) - 20) / 20})` // flicker dot if side powerup
        }

        // Jesus mode: flicker dot gold/white
        if (players[player].powerup.jesus > 0) {
            ctxDO.fillStyle = `rgba(255, ${200 + Math.floor(Math.abs((tFrame % 20) - 10) * 5.5)}, 0, 1)`
        }

        const dotRadius = (playerSize / 2) * players[player].powerup.size
        if (!players[player].alive) continue // continue if player not alive (drawing dot is above, so player dot will still be drawn even if dead)

        if (players[player].powerup.robot == 0) {
            // Calculate wobble offset for shots powerup
            let wobbleX = 0, wobbleY = 0
            if (players[player].powerup.wobble > 0) {
                wobbleX = Math.sin(tFrame * 0.8) * dotRadius * 0.7
                wobbleY = Math.cos(tFrame * 1.1) * dotRadius * 0.7
            }

            // draw dot if normal
            ctxDO.beginPath()
            ctxDO.arc(nextPosX + wobbleX, nextPosY + wobbleY, dotRadius, 0, r2d(360), true)
            ctxDO.fill()

            // draw Fred's photo as head (only if photo is loaded)
            if (player === "fred" && fredPhoto.complete && fredPhoto.naturalWidth > 0) {
                ctxDO.save()
                ctxDO.beginPath()
                ctxDO.arc(nextPosX + wobbleX, nextPosY + wobbleY, dotRadius, 0, r2d(360), true)
                ctxDO.clip()
                ctxDO.drawImage(
                    fredPhoto,
                    nextPosX + wobbleX - dotRadius,
                    nextPosY + wobbleY - dotRadius,
                    dotRadius * 2,
                    dotRadius * 2
                )
                ctxDO.restore()
            }
        } else {
            // draw square if robot
            ctxDO.save()
            ctxDO.translate(nextPosX, nextPosY)
            ctxDO.rotate(players[player].dir - r2d(270))
            ctxDO.fillRect(
                (-playerSize / 2) * players[player].powerup.size,
                (-playerSize / 2) * players[player].powerup.size,
                playerSize * players[player].powerup.size,
                playerSize * players[player].powerup.size
            )
            ctxDO.restore()
        }

	


        // update player turning
        if (players[player].powerup.jesus > 0) {
            // Jesus take the wheel: locked straight, ignore all turning input
            players[player].dir = players[player].powerup.jesusDir
        } else if (players[player].powerup.robot == 0) {
            // if normal
            if (players[player].turnL) {
                if (players[player].powerup.reverse == 0) players[player].dir -= currentTurnSpeed / Math.pow(players[player].powerup.size, 0.3)
                else players[player].dir += currentTurnSpeed / Math.pow(players[player].powerup.size, 0.3)
            }
            if (players[player].turnR) {
                if (players[player].powerup.reverse == 0) players[player].dir += currentTurnSpeed / Math.pow(players[player].powerup.size, 0.3)
                else players[player].dir -= currentTurnSpeed / Math.pow(players[player].powerup.size, 0.3)
            }
            // Shots powerup: add gentle sinusoidal weave to movement direction
            if (players[player].powerup.wobble > 0) {
                players[player].dir += Math.sin(tFrame * 0.12 + players[player].x * 0.01) * 0.018
            }
        } else {
            // if robot
            if (players[player].turnL) {
                players[player].turnL = false
                if (players[player].powerup.reverse == 0) players[player].dir -= r2d(90)
                else players[player].dir += r2d(90)
            }
            if (players[player].turnR) {
                players[player].turnR = false
                if (players[player].powerup.reverse == 0) players[player].dir += r2d(90)
                else players[player].dir -= r2d(90)
            }
        }

        // update player position
        prevPosX = players[player].x
        prevPosY = players[player].y
        players[player].x = nextPosX
        players[player].y = nextPosY

        // check for player inside playing field
        if (players[player].powerup.jesus > 0) {
            // Jesus mode: punch through walls — wrap around like sides
            if (players[player].x < 0) { players[player].x = h; prevPosX = h; prevprevPosX = h }
            if (players[player].x > h) { players[player].x = 0; prevPosX = 0; prevprevPosX = 0 }
            if (players[player].y < 0) { players[player].y = h; prevPosY = h; prevprevPosY = h }
            if (players[player].y > h) { players[player].y = 0; prevPosY = 0; prevprevPosY = 0 }
        } else if (achtung.sides != 0 || players[player].powerup.side != 0) {
            // player has side powerup of achtung.sides, players can move out of canvas
            if (players[player].x < 0) {
                players[player].x = h
                prevPosX = h
                prevprevPosX = h
            }
            if (players[player].x > h) {
                players[player].x = 0
                prevPosX = 0
                prevprevPosX = 0
            }
            if (players[player].y < 0) {
                players[player].y = h
                prevPosY = h
                prevprevPosY = h
            }
            if (players[player].y > h) {
                players[player].y = 0
                prevPosY = 0
                prevprevPosY = 0
            }
        } else {
            if (
                // if not, player dead
                players[player].x < borderWidth + hitboxSize ||
                players[player].x > h - borderWidth - hitboxSize ||
                players[player].y < borderWidth + hitboxSize ||
                players[player].y > h - borderWidth - hitboxSize
            ) {
                givePoints(players[player])
                continue
            }
        }

        // insert bridge
        if (!players[player].bridge) {
            // if not already bridge
            if (Math.random() < bridgeProb) {
                // if math.random() less than prob for bridge
                players[player].bridge = true
            }
            players[player].bridgeFrame = tFrame // what frame did bridge start
        }
        if (players[player].bridgeFrame < tFrame - (bridgeSize / players[player].powerup.speed) * players[player].powerup.size) {
            // stop bridge when bridgeSize frame has passed
            players[player].bridge = false
        }

        // draw player trail; don't draw if bridge or invisible
        // if ghostMode: draw in black — visually hidden on black bg, but alpha=255 so collision still kills
        if (!players[player].bridge && players[player].powerup.invisible == 0) {
            ctxTH.strokeStyle = achtung.ghostMode > 0 ? "#000001" : players[player].color
            ctxTH.lineWidth = playerSize * players[player].powerup.size
            ctxTH.beginPath()
            if (players[player].powerup.robot != 0) {
                ctxTH.lineCap = "round"
                ctxTH.moveTo(prevPosX, prevPosY)
            } else {
                ctxTH.lineCap = "butt"
                ctxTH.moveTo(prevprevPosX, prevprevPosY)
            }
            ctxTH.lineTo(players[player].x, players[player].y)
            ctxTH.stroke()
        }

        // check collision
        const pxFront = Math.round(players[player].x + mathCos(players[player].dir) * hitboxSize * players[player].powerup.size)
        const pyFront = Math.round(players[player].y + mathSin(players[player].dir) * hitboxSize * players[player].powerup.size)
        const pxFront2 = Math.round(players[player].x + mathCos(players[player].dir))
        const pyFront2 = Math.round(players[player].y + mathSin(players[player].dir))
        const pxLeft = Math.round(players[player].x + mathCos(players[player].dir - r2d(55)) * hitboxSize * players[player].powerup.size)
        const pyLeft = Math.round(players[player].y + mathSin(players[player].dir - r2d(55)) * hitboxSize * players[player].powerup.size)
        const pxRight = Math.round(players[player].x + mathCos(players[player].dir + r2d(55)) * hitboxSize * players[player].powerup.size)
        const pyRight = Math.round(players[player].y + mathSin(players[player].dir + r2d(55)) * hitboxSize * players[player].powerup.size)

        // Batch all 4 probe points into one getImageData call per canvas
        // (GPU→CPU readback is expensive; 2 reads beats 8)
        const bMinX = Math.min(pxFront, pxFront2, pxLeft, pxRight)
        const bMinY = Math.min(pyFront, pyFront2, pyLeft, pyRight)
        const bMaxX = Math.max(pxFront, pxFront2, pxLeft, pxRight)
        const bMaxY = Math.max(pyFront, pyFront2, pyLeft, pyRight)
        const bW = bMaxX - bMinX + 1
        const bH = bMaxY - bMinY + 1
        const snapTH = ctxTH.getImageData(bMinX, bMinY, bW, bH).data
        const snapPH = ctxPH.getImageData(bMinX, bMinY, bW, bH).data
        // Read a pixel from a snapshot by absolute canvas coords
        const snapGet = (snap, x, y) => snap[((y - bMinY) * bW + (x - bMinX)) * 4 + 3]
        const snapGetRGB = (snap, x, y) => {
            const i = ((y - bMinY) * bW + (x - bMinX)) * 4
            return [snap[i], snap[i + 1], snap[i + 2]]
        }
        const imgDataFrontTH   = { 3: snapGet(snapTH, pxFront,  pyFront)  }
        const imgDataFrontPH   = snapGetRGB(snapPH, pxFront,  pyFront)
        const imgDataFront2TH  = { 3: snapGet(snapTH, pxFront2, pyFront2) }
        const imgDataFront2PH  = snapGetRGB(snapPH, pxFront2, pyFront2)
        const imgDataLeftTH    = { 3: snapGet(snapTH, pxLeft,   pyLeft)   }
        const imgDataLeftPH    = snapGetRGB(snapPH, pxLeft,   pyLeft)
        const imgDataRightTH   = { 3: snapGet(snapTH, pxRight,  pyRight)  }
        const imgDataRightPH   = snapGetRGB(snapPH, pxRight,  pyRight)

        // uncomment to visualize hitbox
        // ctxDO.fillStyle = "#ffffff"
        // ctxDO.fillRect(pxFront, pyFront, 1, 1)
        // ctxDO.fillRect(pxFront2, pyFront2, 1, 1)
        // ctxDO.fillRect(pxLeft, pyLeft, 1, 1)
        // ctxDO.fillRect(pxRight, pyRight, 1, 1)

        // check collision for every powerup on screen
        for (let i = 0; i < achtung.powerupsOnScreen.length; i++) {
            if (
                (imgDataFrontPH[2] == i * 3 + 1 && imgDataFrontPH[1] == i * 3 + 2 && imgDataFrontPH[0] == i * 3 + 3) ||
                (imgDataLeftPH[2] == i * 3 + 1 && imgDataLeftPH[1] == i * 3 + 2 && imgDataLeftPH[0] == i * 3 + 3) ||
                (imgDataRightPH[2] == i * 3 + 1 && imgDataRightPH[1] == i * 3 + 2 && imgDataRightPH[0] == i * 3 + 3)
            ) {
                let powName = achtung.powerupsOnScreen[i].pow
                players[player].powerup.powerupArray.push(powName)

                // remove powerup from screen
                achtung.powerupsOnScreen.splice(i, 1)

                // do powerup
                doPowerups(player, players[player].powerup.powerupArray.length - 1)

                // draw powerup
                powerupDraw()
            }
        }

        if (!players[player].bridge) {
            // don't check collision if making bridge
            if (players[player].powerup.invisible == 0 && players[player].powerup.jesus == 0) {
                // don't check if invisible or jesus mode
                if (players[player].powerup.robot == 0) {
                    // check alpha value of pixels front, front2, left, right
                    if (imgDataFrontTH[3] == 255 || imgDataFront2TH[3] == 255 || imgDataLeftTH[3] == 255 || imgDataRightTH[3] == 255) {
                        givePoints(players[player])
                        continue
                    }
                } else {
                    if (imgDataFrontTH[3] == 255) {
                        // if robot only check alpha value of front
                        givePoints(players[player])
                        continue
                    }
                }
            }
        }
    }

    // drawGameUI()
    checkGameState()
}

// check game stats
function checkGameState() {
    // how many are alive?
    let alive = 0
    for (const player in players) {
        if (players[player].alive && players[player].ready) {
            alive++
        }
    }

    // if all dead
    if (alive <= 1) {
        window.cancelAnimationFrame(canvasID)
        achtung.gameEnded = true
    }

    // did someone win?
    if (achtung.gameEnded) {
        if (achtung.scoreArray[achtung.scoreArray.length - 1][1] >= achtung.pointGoal) {
            if (achtung.scoreArray[achtung.scoreArray.length - 1][1] - achtung.scoreArray[achtung.scoreArray.length - 2][1] > 1) {
                let p = achtung.scoreArray[achtung.scoreArray.length - 1][0]
                achtung.winner = true

                // draw winner screen
                for (const player in players) {
                    if (player == p) {
                        ctxUI.fillStyle = players[player].color.replace("rgb", "rgba").replace(")", ", 0.3)")
                        ctxUI.fillRect(20 * h100th, 32 * h100th, h - 40 * h100th, h - 64 * h100th)

                        ctxUI.lineWidth = borderWidth
                        ctxUI.strokeStyle = players[player].color
                        ctxUI.strokeRect(20 * h100th, 32 * h100th, h - 40 * h100th, h - 64 * h100th)

                        ctxUI.textBaseline = "middle"
                        ctxUI.fillStyle = players[player].color
                        ctxUI.textAlign = "center"
                        ctxUI.font = `${w100th * 6}px 'Sarabun'`
                        ctxUI.fillText("Konec hry", h / 2, h / 2 - h100th * 5) // the legendary "konec hry"
                        ctxUI.font = `${w100th * 4}px 'Sarabun'`
                        ctxUI.fillText(`${capitalize(player)} wins!`, h / 2, h / 2 + h100th * 5)
                    }
                }
            }
        }
    }
}

// updates points for players
function givePoints(p) {
    p.alive = false

    // Bachelor easter egg: play random audio clip when fred dies
    if (p === players.fred) {
        playFredDeathSound()
    }

    for (const player in players) {
        if (!players[player].ready) continue
        if (p != players[player] && players[player].alive) {
            players[player].score++
            drawGameUI()
        }
    }
}

// draws game ui
const drawGameUI = () => {
    ctxUI.textBaseline = "alphabetic"
    ctxUI.clearRect(h, 0, w - h, h)
    ctxUI.fillStyle = "#000000"
    ctxUI.fillRect(h, 0, w - h, h)

    // sort players
    achtung.scoreArray = []
    for (const player in players) {
        if (!players[player].ready) continue
        achtung.scoreArray.push([player, players[player].score])
    }
    achtung.scoreArray.sort((a, b) => a[1] - b[1])

    // draw top text
    achtung.pointGoal = (achtung.scoreArray.length - 1) * 10
    let UIcenter = +h + (w - h) / 2
    ctxUI.fillStyle = "#FFFFFF"
    ctxUI.textAlign = "center"
    ctxUI.letterSpacing = `${w100th * 0.06}px`
    ctxUI.font = `${w100th * 3}px 'Sarabun'`
    ctxUI.fillText("Race to", UIcenter, w100th * 5)
    ctxUI.font = `${w100th * 12}px 'Sarabun'`
    ctxUI.fillText(achtung.pointGoal, UIcenter, w100th * 15)
    ctxUI.font = `${w100th * 2}px 'Sarabun'`
    ctxUI.fillText("2 point difference", UIcenter, w100th * 19)

    // draw player names and score
    ctxUI.font = `${w100th * 3}px 'Sarabun'`
    let playerYOffset = w100th * 32

    for (let i = achtung.scoreArray.length - 1; i >= 0; i--) {
        let p = achtung.scoreArray[i][0]
        ctxUI.fillStyle = players[p].color
        ctxUI.textAlign = "start"
        ctxUI.fillText(capitalize(p), +h + w100th * 2, playerYOffset)
        ctxUI.textAlign = "end"
        ctxUI.fillText(players[p].score, +w - w100th * 2, playerYOffset)
        playerYOffset += w100th * 5
    }

    // draw space to continue text
    ctxUI.fillStyle = "#FFFFFF"
    ctxUI.textAlign = "center"
    ctxUI.font = `${w100th * 2}px 'Sarabun'`
    ctxUI.fillText("SPACE to play", UIcenter, +h - w100th * 6)
    ctxUI.fillText("ESCAPE to quit", UIcenter, +h - w100th * 3)
}

// executes powerups
function doPowerups(puPlayer, index) {
    let gTimeout = 8000
    let rTimeout = 5000
    let powName = players[puPlayer].powerup.powerupArray[index]

    // powerup starts
    if (powName == "o_random") {
        powName = achtung.powerups[Math.floor(Math.random() * achtung.powerups.length)]
    }
    if (powName == "g_slow") {
        players[puPlayer].powerup.speed *= 0.5
        players[puPlayer].powerup.toClear[index] = setTimeout(() => (players[puPlayer].powerup.speed *= 2), gTimeout)
    }
    if (powName == "g_fast") {
        players[puPlayer].powerup.speed *= 2
        players[puPlayer].powerup.toClear[index] = setTimeout(() => (players[puPlayer].powerup.speed *= 0.5), gTimeout)
    }
    if (powName == "g_thin") {
        players[puPlayer].powerup.size *= 0.5
        players[puPlayer].powerup.toClear[index] = setTimeout(() => (players[puPlayer].powerup.size *= 2), gTimeout)
    }
    if (powName == "g_robot") {
        players[puPlayer].powerup.robot++
        players[puPlayer].powerup.toClear[index] = setTimeout(() => players[puPlayer].powerup.robot--, gTimeout)
    }
    if (powName == "g_side") {
        players[puPlayer].powerup.side++
        players[puPlayer].powerup.toClear[index] = setTimeout(() => players[puPlayer].powerup.side--, gTimeout)
    }
    if (powName == "g_invisible") {
        players[puPlayer].powerup.invisible++
        players[puPlayer].powerup.toClear[index] = setTimeout(() => players[puPlayer].powerup.invisible--, gTimeout)
    }
    if (powName == "r_slow") {
        for (const otherPlayers in players) {
            if (otherPlayers != puPlayer) {
                players[otherPlayers].powerup.speed *= 0.5
                players[otherPlayers].powerup.toClear[index] = setTimeout(() => (players[otherPlayers].powerup.speed *= 2), rTimeout)
            }
        }
    }
    if (powName == "r_fast") {
        for (const otherPlayers in players) {
            if (otherPlayers != puPlayer) {
                players[otherPlayers].powerup.speed *= 2
                players[otherPlayers].powerup.toClear[index] = setTimeout(() => (players[otherPlayers].powerup.speed *= 0.5), rTimeout)
            }
        }
    }
    if (powName == "r_thick") {
        for (const otherPlayers in players) {
            if (otherPlayers != puPlayer) {
                players[otherPlayers].powerup.size *= 2
                players[otherPlayers].powerup.toClear[index] = setTimeout(() => (players[otherPlayers].powerup.size *= 0.5), rTimeout)
            }
        }
    }
    if (powName == "r_robot") {
        for (const otherPlayers in players) {
            if (otherPlayers != puPlayer) {
                players[otherPlayers].powerup.robot++
                players[otherPlayers].powerup.toClear[index] = setTimeout(() => players[otherPlayers].powerup.robot--, rTimeout)
            }
        }
    }
    if (powName == "r_reverse") {
        for (const otherPlayers in players) {
            if (otherPlayers != puPlayer) {
                players[otherPlayers].powerup.reverse++
                players[otherPlayers].powerup.toClear[index] = setTimeout(() => players[otherPlayers].powerup.reverse--, rTimeout)
            }
        }
    }
    if (powName == "b_clear") {
        ctxTH.clearRect(0, 0, h, h)
    }
    if (powName == "b_more") {
        setTimeout(powerupSpawner, 100)
        setTimeout(powerupSpawner, 200)
        setTimeout(powerupSpawner, 300)
    }
    if (powName == "b_sides") {
        achtung.sides++
        achtung.clearSides = setTimeout(() => achtung.sides--, gTimeout)
    }

    // ======= BACHELOR PARTY POWERUPS =======
    if (powName == "r_shots") {
        // Shots: wobble heads of all other players for 5s
        let shotsTimeout = 5000
        for (const otherPlayers in players) {
            if (otherPlayers != puPlayer) {
                players[otherPlayers].powerup.wobble++
                players[otherPlayers].powerup.toClear[index] = setTimeout(() => players[otherPlayers].powerup.wobble--, shotsTimeout)
            }
        }
    }
    if (powName == "g_jesus") {
        // Jesus take the wheel: straight line, invincible, wall-punching, 3s
        let jesusTimeout = 3000
        players[puPlayer].powerup.jesus++
        players[puPlayer].powerup.jesusDir = players[puPlayer].dir // lock current direction
        players[puPlayer].powerup.toClear[index] = setTimeout(() => {
            players[puPlayer].powerup.jesus--
        }, jesusTimeout)
    }
    
    if (powName == "b_ghost") {
        // Ghost Mode: ALL trails become invisible (black) for 4s — still lethal, everyone must remember
        let ghostTimeout = 4000
        achtung.ghostMode++
        achtung.clearGhost = setTimeout(() => achtung.ghostMode--, ghostTimeout)
    }

    // 1. Red Power-up: Sirkusteltta Pystyyn (Sabotages everyone else by flying a tent down)
    if (powName == "r_circus") {
        let p = players[puPlayer];
        let speedMult = moveSpeed * 1.5;
        let startX, startY, vx, vy;

        // Find the distance to all 4 edges to spawn it as far away as possible
        let distLeft = p.x;
        let distRight = h - p.x;
        let distTop = p.y;
        let distBottom = h - p.y;
        
        let maxDist = Math.max(distLeft, distRight, distTop, distBottom);

        // Spawn on the furthest edge, and keep it on the opposite half of the board
        if (maxDist === distLeft) { 
            startX = -40; 
            startY = p.y < h / 2 ? (h / 2 + Math.random() * (h / 2)) : (Math.random() * (h / 2));
            vx = speedMult; 
            vy = (Math.random() - 0.5) * speedMult; 
        } 
        else if (maxDist === distRight) { 
            startX = h + 40; 
            startY = p.y < h / 2 ? (h / 2 + Math.random() * (h / 2)) : (Math.random() * (h / 2));
            vx = -speedMult; 
            vy = (Math.random() - 0.5) * speedMult; 
        } 
        else if (maxDist === distTop) { 
            startX = p.x < h / 2 ? (h / 2 + Math.random() * (h / 2)) : (Math.random() * (h / 2));
            startY = -40; 
            vx = (Math.random() - 0.5) * speedMult; 
            vy = speedMult; 
        } 
        else { 
            // Bottom edge
            startX = p.x < h / 2 ? (h / 2 + Math.random() * (h / 2)) : (Math.random() * (h / 2));
            startY = h + 40; 
            vx = (Math.random() - 0.5) * speedMult; 
            vy = -speedMult; 
        }

        activeCircuses.push({
            x: startX,
            y: startY,
            vx: vx,
            vy: vy,
            radius: w100th * 6, // Sizable circus tent circle radius
            owner: puPlayer     // Save who spawned it so they are immune!
        });
    }

}

// updates the achtung object with data of a new powerup
function powerupSpawner() {
    if (achtung.powerupsOnScreen.length > 30) return
    let newPow = Math.floor(Math.random() * achtung.powerups.length),
        spawnX = Math.floor(Math.random() * h),
        spawnY = Math.floor(Math.random() * h),
        powup = achtung.powerups[newPow]

    achtung.powerupsOnScreen[achtung.powerupsOnScreen.length] = {}
    achtung.powerupsOnScreen[achtung.powerupsOnScreen.length - 1].pow = powup
    achtung.powerupsOnScreen[achtung.powerupsOnScreen.length - 1].xPos = spawnX
    achtung.powerupsOnScreen[achtung.powerupsOnScreen.length - 1].yPos = spawnY

    powerupDraw()
}

// draws powerups to canvas
function powerupDraw() {
    ctxPV.clearRect(0, 0, w, h)
    ctxPH.clearRect(0, 0, w, h)

    for (let i = 0; i < achtung.powerupsOnScreen.length; i++) {
        if (achtung.powerupsOnScreen[i] == 0) continue

        let pow = achtung.powerupsOnScreen[i].pow,
            spawnX = achtung.powerupsOnScreen[i].xPos,
            spawnY = achtung.powerupsOnScreen[i].yPos

        // draw hitbox
        ctxPH.fillStyle = `rgba(${i * 3 + 3}, ${i * 3 + 2}, ${i * 3 + 1}, 1)`
        ctxPH.beginPath()
        ctxPH.arc(spawnX, spawnY, iconSize, 0, r2d(360), false)
        ctxPH.fill()

        let greenGrad = ctxPV.createRadialGradient(0, 0, 0, 0, 0, iconSize)
        greenGrad.addColorStop(0, green)
        greenGrad.addColorStop(1, greent)
        let redGrad = ctxPV.createRadialGradient(0, 0, 0, 0, 0, iconSize)
        redGrad.addColorStop(0, red)
        redGrad.addColorStop(1, redt)
        let blueGrad = ctxPV.createRadialGradient(0, 0, 0, 0, 0, iconSize)
        blueGrad.addColorStop(0, blue)
        blueGrad.addColorStop(1, bluet)

        ctxPV.save()
        ctxPV.translate(spawnX, spawnY)

        ctxPV.fillStyle = "#000000"
        ctxPV.beginPath()
        ctxPV.arc(0, 0, iconSize, 0, r2d(360), false)
        ctxPV.fill()

        if (pow.charAt(0) == "g") {
            ctxPV.strokeStyle = green
            ctxPV.fillStyle = greenGrad
        }
        if (pow.charAt(0) == "r") {
            ctxPV.strokeStyle = red
            ctxPV.fillStyle = redGrad
        }
        if (pow.charAt(0) == "b") {
            ctxPV.strokeStyle = blue
            ctxPV.fillStyle = blueGrad
        }
        if (pow.charAt(0) == "g" || pow.charAt(0) == "r" || pow.charAt(0) == "b") {
            // draw bg
            ctxPV.beginPath()
            ctxPV.arc(0, 0, iconSize, 0, r2d(360), false)
            ctxPV.stroke()
            ctxPV.beginPath()
            ctxPV.arc(0, 0, iconSize, 0, r2d(360), false)
            ctxPV.fill()
        } else {
            // draw random bg
            ctxPV.strokeStyle = blue
            ctxPV.beginPath()
            ctxPV.arc(0, 0, iconSize, 0, r2d(360), false)
            ctxPV.stroke()

            let line1 = [-65, -200]
            let line2 = [-15, -250]

            // draw blue section of bg
            ctxPV.beginPath()
            ctxPV.fillStyle = blueGrad
            ctxPV.arc(0, 0, iconSize, r2d(line1[0]), r2d(line1[1]), true)
            ctxPV.moveTo(Math.cos(r2d(line1[1])) * iconSize, Math.sin(r2d(line1[1])) * iconSize)
            ctxPV.lineTo(Math.cos(r2d(line1[0])) * iconSize, Math.sin(r2d(line1[0])) * iconSize)
            ctxPV.fill()

            // draw red section of bg
            ctxPV.beginPath()
            ctxPV.fillStyle = redGrad
            ctxPV.arc(0, 0, iconSize, r2d(line2[0]), r2d(line1[0]), true)
            ctxPV.moveTo(Math.cos(r2d(line1[0])) * iconSize, Math.sin(r2d(line1[0])) * iconSize)
            ctxPV.lineTo(Math.cos(r2d(line1[1])) * iconSize, Math.sin(r2d(line1[1])) * iconSize)
            ctxPV.arc(0, 0, iconSize, r2d(line1[1]), r2d(line2[1]), true)
            ctxPV.lineTo(Math.cos(r2d(line2[0])) * iconSize, Math.sin(r2d(line2[0])) * iconSize)
            ctxPV.fill()

            // draw green section of bg
            ctxPV.beginPath()
            ctxPV.fillStyle = greenGrad
            ctxPV.arc(0, 0, iconSize, r2d(line2[1]), r2d(line2[0]), true)
            ctxPV.moveTo(Math.cos(r2d(line2[0])) * iconSize, Math.sin(r2d(line2[0])) * iconSize)
            ctxPV.lineTo(Math.cos(r2d(line2[1])) * iconSize, Math.sin(r2d(line2[1])) * iconSize)
            ctxPV.fill()
        }

        // draw yellow icon (or custom image for special powerups)
        if (pow === "b_ghost" && ghostPowerupImage.complete && ghostPowerupImage.naturalWidth > 0) {
            // Clip and draw the custom ghost image inside the powerup circle
            ctxPV.save()
            ctxPV.beginPath()
            ctxPV.arc(0, 0, iconSize * 0.75, 0, r2d(360), false)
            ctxPV.clip()
            ctxPV.drawImage(ghostPowerupImage, -iconSize * 0.75, -iconSize * 0.75, iconSize * 1.5, iconSize * 1.5)
            ctxPV.restore()
        } else {
            drawPowerupIcons(pow.slice(2))
        }

        ctxPV.restore()
    }
}

// calc random start direction
function calcRandomStartDir() {
    for (const player in players) {
        players[player].dir = round100(Math.random() * Math.PI * 2)
    }
}

// calc random start position x and y
function calcRandomStartPos() {
    for (const player in players) {
        players[player].x = map(calcRandomInt(h), 0, h, borderWidth * 10, h - borderWidth * 10) // map to avoid instant death
        players[player].y = map(calcRandomInt(h), 0, h, borderWidth * 10, h - borderWidth * 10) // map to avoid instant death
    }
}

// capitalize string
const capitalize = (s) => (typeof s === "string" ? s.charAt(0).toUpperCase() + s.slice(1) : "")

// returns n rounded to .00
const round100 = (n) => Math.round(n * 100) / 100

// returns n round mathCos and mathSin
const mathCos = (n) => round100(Math.cos(n))
const mathSin = (n) => round100(Math.sin(n))

// returns pixel index for alpha value in raw pixel data string
const getAlphaIndexForCoord = (x, y, width) => y * (width * 4) + x * 4 + 3

// returns radians from degree input
const r2d = (deg) => ((Math.PI * 2) / 360) * deg

// returns random int from 0 to n
const calcRandomInt = (int) => Math.floor(Math.random() * int)

// returns n mapped from start1-stop1 to start2-stop2
const map = (n, start1, stop1, start2, stop2) => ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2

newSize() //  calc initial values
init() //  start init
