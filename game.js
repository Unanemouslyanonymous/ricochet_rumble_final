const pieceTable = {
    'rt': 'r-titan',
    'rb': 'r-tank',
    'rr': 'r-ricochet',
    'rs': 'r-semi-ricochet',
    'rc': 'r-cannon',
    'bt': 'b-titan',
    'bb': 'b-tank',
    'br': 'b-ricochet',
    'bs': 'b-semi-ricochet',
    'bc': 'b-cannon'
};

let initialPosition = [
    ['', '', 'rc2', '', 'rt', '', 'rb', ''],
    ['', '', 'rr1', '', '', 'rs3', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', 'bs3', '', 'br1', '', ''],
    ['', 'bb', '', 'bt', '', 'bc', '', ''],
];

const canRotate = {
    'r': true,
    's': true,
    'b': true,
};

let paused = false;
let movesList = [];
const blueInitTime = 300;
const redInitTime = 300;
let blueTime = blueInitTime;
let redTime = redInitTime;
let botMode = false;

let Cells = {};
let Pieces = {};

let previousValidMoves = [];
let selectedCell = null;

let Turn = 'b';

let lButton = document.getElementById('rot-l');
let rButton = document.getElementById('rot-r');

function toChessNotation(position) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const rank = position[0] + 1;
    const file = files[position[1]];
    return `${file}${rank}`;
}

class Cell {
    constructor(i, j, piece) {
        this.id = i + '-' + j;
        this.position = [i, j];
        this.piece = piece;
    }

    element() {
        let cell = document.createElement('button');
        cell.className = 'cell';
        cell.id = this.id;

        document.getElementById('board').appendChild(cell);

        return cell;
    }

    getValid() {
        if (!this.piece) return false;

        let validMoves = [];
        let totalMoves = [];

        if (this.piece['type'] == 'c') {
            totalMoves.push(`${this.position[0]}-${this.position[1] - 1}`);
            totalMoves.push(`${this.position[0]}-${this.position[1] + 1}`);
        } else {
            for (let i = -1; i < 2; i++) {
                for (let j = -1; j < 2; j++) {
                    if (i == 0 && j == 0) continue;
                    let x = this.position[0] + i;
                    let y = this.position[1] + j;
                    totalMoves.push(`${x}-${y}`);
                }
            }
        }

        for (let cellId in totalMoves) {
            if (Cells[totalMoves[cellId]]) {
                if (
                    !Cells[totalMoves[cellId]].piece ||
                    (
                        this.piece.type == 'r' &&
                        Cells[totalMoves[cellId]].piece.type != 't' &&
                        Cells[totalMoves[cellId]].piece.type != 'c'
                    ) ||
                    (
                        this.piece.type == 'r' &&
                        Cells[totalMoves[cellId]].piece.type == 'c' &&
                        this.position[0] == Cells[totalMoves[cellId]].piece.position[0]
                    )
                ) {
                    validMoves.push(totalMoves[cellId]);
                }
            }
        }

        return validMoves;
    }
}

class Piece {
    constructor(type, team, i, j, orientation = 0) {
        this.type = type;
        this.team = team;
        this.position = [i, j];
        this.orientation = orientation;
        this.id = i + '-' + j + '-' + team + type + orientation;
    }

    element() {
        let div = document.createElement('div');
        div.className = 'piece ' + pieceTable[this.team + this.type];
        div.style.transform = `rotate(${this.orientation * 90}deg)`;
        div.id = this.id;
        return div;
    }

    shoot() {
        if (this.type != 'c' || this.team != Turn) return false;

        function getAbsolutePosition(element) {
            const rect = element.getBoundingClientRect();
            const scrollLeft = document.documentElement.scrollLeft;
            const scrollTop = document.documentElement.scrollTop;

            const absoluteMidpointX = rect.left + scrollLeft + rect.width / 2;
            const absoluteMidpointY = rect.top + scrollTop + rect.height / 2;

            return [absoluteMidpointX, absoluteMidpointY];
        }

        let updateVector = [0, 0];
        let currentVector = Array.from(this.position);

        const cannon = document.getElementById(currentVector[0] + '-' + currentVector[1]);

        let bullet = document.createElement('img');
        bullet.className = 'bullet ' + Turn;
        bullet.style.left = getAbsolutePosition(cannon)[0] - 10 + 'px';
        bullet.style.top = getAbsolutePosition(cannon)[1] - 10 + 'px';
        document.getElementById('container').appendChild(bullet);

        const cellDist = getAbsolutePosition(document.getElementById('0-1'))[0] - getAbsolutePosition(document.getElementById('0-0'))[0];

        const bulletSpeed = 1;
        let L = { d: 0, recur: 0 };
        let T = { d: 0, recur: 0 };
        let currentCell;
        let currentCelle;
        let isAnimating = false;
        let deflectors = false;

        function passThrough() {
            isAnimating = true;

            currentCelle = document.getElementById(currentCell.id);

            L.d = Math.abs(getAbsolutePosition(bullet)[0] - getAbsolutePosition(currentCelle)[0] + (cellDist / 2 * updateVector[1]));
            T.d = Math.abs(getAbsolutePosition(bullet)[1] - getAbsolutePosition(currentCelle)[1] + (cellDist / 2 * updateVector[0]));

            L.recur = Math.floor(L.d / bulletSpeed);
            T.recur = Math.floor(T.d / bulletSpeed);

            requestAnimationFrame(animateBullet);
        }

        function animateBullet() {
            if (isAnimating) {
                bullet.style.left = bullet.offsetLeft + bulletSpeed * updateVector[1] + 'px';
                bullet.style.top = bullet.offsetTop + bulletSpeed * updateVector[0] + 'px';

                L.recur--;
                T.recur--;

                if (updateVector[1] === 1) {
                    bullet.style.transform = `rotate(90deg)`;
                } else if (updateVector[1] === -1) {
                    bullet.style.transform = `rotate(-90deg)`;
                } else if (updateVector[0] === 1) {
                    bullet.style.transform = `rotate(180deg)`;
                } else if (updateVector[0] === -1) {
                    bullet.style.transform = `rotate(0deg)`;
                }

                if (L.recur <= 0 && T.recur <= 0) {
                    if (deflectors) {
                        bullet.style.left = getAbsolutePosition(currentCelle)[0] + (cellDist * updateVector[1]) - 10 + 'px';
                        bullet.style.top = getAbsolutePosition(currentCelle)[1] + (cellDist * updateVector[0]) - 10 + 'px';

                        deflectors = false;
                    } else {
                        bullet.style.left = getAbsolutePosition(currentCelle)[0] + (cellDist / 2 * updateVector[1]) - 10 + 'px';
                        bullet.style.top = getAbsolutePosition(currentCelle)[1] + (cellDist / 2 * updateVector[0]) - 10 + 'px';
                    }

                    isAnimating = false;
                }
                requestAnimationFrame(animateBullet);
            } else {
                currentVector[0] += updateVector[0];
                currentVector[1] += updateVector[1];

                currentCell = Cells[currentVector[0] + '-' + currentVector[1]];

                if (currentCell) {
                    if (currentCell.piece) {
                        if (currentCell.piece.type === 't') {
                            if (currentCell.piece.team === Turn) {
                                playerWin(Turn === 'b' ? 'Red' : 'Blue');
                                bullet.remove();
                            } else {
                                passThrough();
                            }
                        } else if (currentCell.piece.type === 'b') {
                            let tank = currentCell.piece;
                            if (
                                (tank.orientation % 2 === 0 && updateVector[1]) ||
                                (tank.orientation % 2 === 1 && updateVector[0])
                            ) {
                                passThrough();
                            } else {
                                bullet.remove();
                            }
                        } else if (currentCell.piece.type === 'r') {
                            let ricochet = currentCell.piece.orientation;

                            if (ricochet % 2 === 0) {
                                if (updateVector[0]) {
                                    updateVector[1] = updateVector[0];
                                    updateVector[0] = 0;
                                } else {
                                    updateVector[0] = updateVector[1];
                                    updateVector[1] = 0;
                                }
                            } else {
                                if (updateVector[1]) {
                                    updateVector[0] = -updateVector[1];
                                    updateVector[1] = 0;
                                } else {
                                    updateVector[1] = -updateVector[0];
                                    updateVector[0] = 0;
                                }
                            }

                            passThrough();
                        } else if (currentCell.piece.type === 's') {
                            let srico = currentCell.piece.orientation;
                            if (srico % 2 === 0) {
                                if (
                                    (srico === 0 && (updateVector[0] < 0 || updateVector[1] > 0)) ||
                                    (srico === 2 && (updateVector[0] > 0 || updateVector[1] < 0))
                                ) {
                                    if (updateVector[0]) {
                                        updateVector[1] = updateVector[0];
                                        updateVector[0] = 0;
                                    } else {
                                        updateVector[0] = updateVector[1];
                                        updateVector[1] = 0;
                                    }

                                    passThrough();
                                } else {
                                    if (currentCell.piece) {
                                        document.getElementById(currentCell.piece.id).remove();
                                        Pieces[currentCell.piece.id] = null;
                                        currentCell.piece = null;
                                    }

                                    bullet.remove();
                                }
                            } else {
                                if (
                                    (srico === 1 && (updateVector[0] > 0 || updateVector[1] > 0)) ||
                                    (srico === 3 && (updateVector[0] < 0 || updateVector[1] < 0))
                                ) {
                                    if (updateVector[0]) {
                                        updateVector[1] = -updateVector[0];
                                        updateVector[0] = 0;
                                    } else {
                                        updateVector[0] = -updateVector[1];
                                        updateVector[1] = 0;
                                    }

                                    passThrough();
                                } else {
                                    if (currentCell.piece) {
                                        document.getElementById(currentCell.piece.id).remove();
                                        Pieces[currentCell.piece.id] = null;
                                        currentCell.piece = null;
                                    }

                                    bullet.remove();
                                }
                            }
                        } else if (currentCell.piece.type === 'c') {
                            passThrough();
                        }
                    } else {
                        let nextVector = [
                            currentVector[0] + updateVector[0],
                            currentVector[1] + updateVector[1]
                        ];
                        let nextCell = Cells[nextVector[0] + '-' + nextVector[1]];
                        if (nextCell && nextCell.piece && (nextCell.piece.type === 's' || nextCell.piece.type === 'r')) {
                            deflectors = true;
                        }

                        passThrough();
                    }
                } else {
                    bullet.remove();
                }
            }
        }

        updateVector[0] = this.orientation ? 1 : -1;
        requestAnimationFrame(animateBullet);
    }
}

//--------------------------------------------------------------------------------
// Left/Right rotation button click event handlers

lButton.addEventListener('click', () => {
    if (selectedCell && selectedCell.piece) {
        let movesEntry = {
            team: selectedCell.piece.team,
            type: selectedCell.piece.type,
            orientation: {
                old: selectedCell.piece.orientation,
                new: (selectedCell.piece.orientation + 1) % 4
            },
        }
        updateMoves(movesEntry);

        selectedCell.piece.orientation = (selectedCell.piece.orientation + 1) % 4;
        document.getElementById(selectedCell.piece.id).style.transform = `rotate(${selectedCell.piece.orientation * 90}deg)`;
        
        for (let cellId in previousValidMoves) {
            document.getElementById(previousValidMoves[cellId]).className = 'cell';
        }

        previousValidMoves = []
        switchTurns()
    }
});

rButton.addEventListener('click', () => {
    if (selectedCell && selectedCell.piece) {
        let movesEntry = {
            team: selectedCell.piece.team,
            type: selectedCell.piece.type,
            orientation: {
                old: selectedCell.piece.orientation,
                new: (selectedCell.piece.orientation + 3) % 4
            },
        }
        updateMoves(movesEntry);

        selectedCell.piece.orientation = (selectedCell.piece.orientation + 3) % 4;
        document.getElementById(selectedCell.piece.id).style.transform = `rotate(${selectedCell.piece.orientation * 90}deg)`;
    
        for (let cellId in previousValidMoves) {
            document.getElementById(previousValidMoves[cellId]).className = 'cell';
        }

        previousValidMoves = []
        switchTurns()
    }
});

//--------------------------------------------------------------------------------
// Timer

const blueButton = document.getElementById('blueButton');
const redButton = document.getElementById('redButton');

let blueInterval, redInterval;

function startBlueTimer() {
    clearInterval(redInterval);
    blueButton.disabled = false;
    redButton.disabled = true;

    blueInterval = setInterval(() => {
        if (!paused) {
            blueTime--;
            updateButtonDisplay(blueButton, blueTime);

            if (blueTime <= 0) {
                playerWin('Red');
                clearInterval(blueInterval);
            }
        }
    }, 1000);
}

function startRedTimer() {
    clearInterval(blueInterval);
    blueButton.disabled = true;
    redButton.disabled = false;

    redInterval = setInterval(() => {
        if (!paused) {
            redTime--;
            updateButtonDisplay(redButton, redTime);

            if (redTime <= 0) {
                playerWin('Blue');
                clearInterval(redInterval);
            }
        }
    }, 1000);
}

function updateButtonDisplay(buttonElement, time) {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    buttonElement.textContent = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function updateMoves(entry) {
    movesList.push(entry);

    let entryText;

    if (entry.position) {
        const oldPosition = toChessNotation(entry.position.old);
        const newPosition = toChessNotation(entry.position.new);
        
        entryText = 
            pieceTable[entry.team + entry.type].slice(2).charAt(0).toUpperCase() 
            + pieceTable[entry.team + entry.type].slice(2).slice(1)
            + '<br>'
            + oldPosition
            + ' &rarr; '
            + newPosition;
    } else {
        function getOrien(orien) {
            switch (orien) {
                case 0:
                    return 'North';
                case 1:
                    return 'East';
                case 2:
                    return 'South';
                case 3:
                    return 'West';
            }
        }

        entryText = 
            pieceTable[entry.team + entry.type].slice(2).charAt(0).toUpperCase() 
            + pieceTable[entry.team + entry.type].slice(2).slice(1)
            + '<br>'
            + getOrien(entry.orientation.old)
            +' &rarr; '
            + getOrien(entry.orientation.new);
    }

    const moves = document.getElementById(`moves-${entry.team}`);
    const movesEntry = document.createElement('div');
    movesEntry.className = 'moves-entry';
    movesEntry.innerHTML = entryText;
    moves.appendChild(movesEntry);
}

function playerWin(p) {
    paused = true;

    const overlay = document.getElementById('overlay');
    const overlayText = document.getElementById('overlay-text');
    const pauseResumeOverlay = document.getElementById('pauseResumeOverlay');

    overlay.style.display = 'block';
    overlayText.innerHTML = `${p} has won!`;

    pauseResumeOverlay.remove();

    localStorage.setItem('gameHistory', JSON.stringify(movesList));
    playSound('winSound');
}

//--------------------------------------------------------------------------------

function shootCannon() {
    for (let pieceId in Pieces) {
        if (Pieces[pieceId]) {
            Pieces[pieceId].shoot();
        }
    }
}

function controls() {
    const pauseResumeBtn = document.getElementById('pauseResumeBtn');
    const pauseResumeOverlay = document.getElementById('pauseResumeOverlay');
    const overlay = document.getElementById('overlay');

    pauseResumeBtn.addEventListener('click', () => {
        if (!paused) {
            paused = true;
            pauseResumeBtn.innerHTML = '<i class="fas fa-play fa-3x"></i>';
            overlay.style.display = 'block';
        } else {
            paused = false;
            pauseResumeBtn.innerHTML = '<i class="fas fa-pause fa-3x"></i>';
            overlay.style.display = 'none';
        }
    });

    pauseResumeOverlay.addEventListener('click', () => {
        paused = false;
        overlay.style.display = 'none';

        pauseResumeBtn.innerHTML = '<i class="fas fa-pause fa-3x"></i>';
    });

    resetBtn.addEventListener('click', () => {
        resetBoard();
    });
}

function switchTurns() {
    shootCannon();

    if (Turn === 'b') {
        Turn = 'r';
        startRedTimer();
        if (botMode) {
            
            setTimeout(botMove, 1000);
        }
    } else if (Turn === 'r') {
        Turn = 'b';
        startBlueTimer();
    }

    lButton.disabled = true;
    rButton.disabled = true;
}

function botMove() {
    let botPieces = Object.values(Pieces).filter(piece => piece && piece.team === 'r');
    let validMoves = [];

   
    for (let piece of botPieces) {
        let cell = Cells[piece.position[0] + '-' + piece.position[1]];
        let moves = cell.getValid();
        for (let move of moves) {
            validMoves.push({ piece, move });
        }
    }

    if (validMoves.length > 0) {
        let randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        let targetCell = Cells[randomMove.move];
        let movingPiece = randomMove.piece;

        let oldCellId = movingPiece.position[0] + '-' + movingPiece.position[1];
        document.getElementById(oldCellId).innerHTML = '';
        Cells[oldCellId].piece = null;

        
        movingPiece.position = targetCell.position;
        targetCell.piece = movingPiece;

        
        delete Pieces[movingPiece.id];
        movingPiece.id = movingPiece.position[0] + '-' + movingPiece.position[1] + '-' + movingPiece.team + movingPiece.type + movingPiece.orientation;
        Pieces[movingPiece.id] = movingPiece;

        let elem = movingPiece.element();
        document.getElementById(`${targetCell.position[0]}-${targetCell.position[1]}`).appendChild(elem);

            let movesEntry = {
            team: movingPiece.team,
            type: movingPiece.type,
            position: {
                old: oldCellId.split('-').map(Number),
                new: targetCell.position
            },
        };
        updateMoves(movesEntry);

        playSound('moveSound');
    }

    switchTurns();
}

function generateGrid() {
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            let cell = new Cell(i, j);
            let elem = cell.element();

            Cells[cell.id] = cell;

            elem.addEventListener('click', () => {
                if (botMode && Turn === 'r') return; 

                let validMoves = cell.getValid();

                if (previousValidMoves.includes(cell.id)) {
                    let movesEntry = {
                        team: selectedCell.piece.team,
                        type: selectedCell.piece.type,
                        position: {
                            old: selectedCell.piece.position,
                            new: [i, j]
                        },
                    }
                    updateMoves(movesEntry);

                    if (selectedCell.piece.type == 'r' && cell.piece) {
                        let selectedPiece = selectedCell.piece;

                        let temp = Array.from(selectedCell.piece.position);
                        selectedCell.piece.position = [i, j];
                        cell.piece.position = temp;

                        document.getElementById(cell.piece.id).remove();
                        document.getElementById(selectedCell.piece.id).remove();
                        let elemC = cell.piece.element();
                        let elemS = selectedPiece.element();
                        document.getElementById(`${cell.piece.position[0]}-${cell.piece.position[1]}`).appendChild(elemC);
                        document.getElementById(`${selectedPiece.position[0]}-${selectedPiece.position[1]}`).appendChild(elemS);

                        temp = selectedCell.piece;
                        selectedCell.piece = cell.piece;
                        cell.piece = temp;
                    } else {
                        selectedCell.piece.position = [i, j];
                        cell.piece = selectedCell.piece;

                        document.getElementById(cell.piece.id).remove();
                        let elem = cell.piece.element();
                        document.getElementById(`${i}-${j}`).appendChild(elem);

                        selectedCell.piece = null;
                    }

                    playSound('moveSound');
                    switchTurns();

                    for (let cellId in previousValidMoves) {
                        document.getElementById(previousValidMoves[cellId]).className = 'cell';
                    }
                    previousValidMoves = [];
                    selectedCell = null;
                } else {
                    selectedCell = cell;

                    for (let cellId in previousValidMoves) {
                        document.getElementById(previousValidMoves[cellId]).className = 'cell';
                        lButton.disabled = true;
                        rButton.disabled = true;
                    }
                    previousValidMoves = [];
                    
                    if (!cell.piece || cell.piece.team != Turn) return false;

                    for (let cellId in validMoves) {
                        document.getElementById(validMoves[cellId]).className = 'cell-valid';
                        previousValidMoves.push(validMoves[cellId]);
                    }

                    if (cell.piece && canRotate[cell.piece.type]) {
                        lButton.disabled = false;
                        rButton.disabled = false;
                    }

                    if (validMoves.length == 0) selectedCell = null;
                }
            });
        }
    }
}

function initializePosition() {
    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            if (!initialPosition[i][j]) continue;

            let entry = initialPosition[i][j];
            
            let piece = new Piece(
                entry[1],
                entry[0],
                i, j,
                entry[2] ? Number(entry[2]) : 0
            );

            let elem = piece.element();
            document.getElementById(`${i}-${j}`).appendChild(elem);

            Pieces[piece.id] = piece;
            Cells[i + '-' + j].piece = piece;
        }
    }
}

function resetBoard() {
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if (Cells[i + '-' + j].piece) {
                let id = Cells[i + '-' + j].piece.id;

                Pieces[id] = null;
                document.getElementById(id).remove();
                Cells[i + '-' + j].piece = null;
            }
        }
    }

    initializePosition();
    
    const pauseResumeBtn = document.getElementById('pauseResumeBtn');
    const pauseResumeOverlay = document.getElementById('pauseResumeOverlay');
    const overlay = document.getElementById('overlay');

    paused = false;
    Turn = 'b';
    previousValidMoves = [];
    selectedCell = null;
    pauseResumeBtn.innerHTML = '<i class="fas fa-pause"></i>';
    overlay.style.display = 'none';

    if (!document.getElementById('pauseResumeOverlay')) {
        const resumeBtn = document.createElement('button');
        resumeBtn.id ='pauseResumeOverlay';
        resumeBtn.className = 'icon';
        resumeBtn.title = 'Resume';
        resumeBtn.innerHTML = '<i class="fas fa-play"></i>';
        document.getElementById('overlay-content').insertBefore(resumeBtn, document.getElementById('resetBtn'));
    }
    document.getElementById('overlay-text').innerHTML = 'Game paused';

    blueTime = blueInitTime;
    redTime = redInitTime;
    updateButtonDisplay(blueButton, blueTime);
    updateButtonDisplay(redButton, redTime);
    clearInterval(blueInterval);
    clearInterval(redInterval);

    movesList = [];
    const moves_b = document.getElementById('moves-b');
    while (moves_b.firstChild) {
        moves_b.removeChild(moves_b.firstChild);
    }
    const moves_r = document.getElementById('moves-r');
    while (moves_r.firstChild) {
        moves_r.removeChild(moves_r.firstChild);
    }
}

//----------------------------------------------------------------
// Runs after loading
document.addEventListener('DOMContentLoaded', function() {
    generateGrid();
    initializePosition();

    updateButtonDisplay(blueButton, blueTime);
    updateButtonDisplay(redButton, redTime);
    controls();

    const toggleBotBtn = document.getElementById('toggleBotBtn');
    toggleBotBtn.addEventListener('click', () => {
        botMode = !botMode;
        toggleBotBtn.textContent = `Bot Mode: ${botMode ? 'ON' : 'OFF'}`;
    });

    document.getElementById('overlay').style.display = 'none';
});

function playSound(soundId) {
    const sound = document.getElementById(soundId);
    if (sound) {
        sound.play();
    }
}
