import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  TETROMINO_SHAPES,
  COLORS,
  INITIAL_DROP_TIME,
  LEVEL_SPEED_INCREASE,
  LINES_PER_LEVEL,
} from './constants';

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export class Tetromino {
  public shape: number[][];
  public color: number;
  public x: number;
  public y: number;

  constructor(type: TetrominoType, x: number = 0, y: number = 0) {
    this.shape = TETROMINO_SHAPES[type].map(row => [...row]);
    this.color = COLORS[type];
    this.x = x;
    this.y = y;
  }

  rotate(): void {
    const newShape = this.shape[0].map((_, index) =>
      this.shape.map(row => row[index]).reverse()
    );
    this.shape = newShape;
  }

  collides(board: number[][], x = this.x, y = this.y): boolean {
    for (let row = 0; row < this.shape.length; row++) {
      for (let col = 0; col < this.shape[row].length; col++) {
        if (this.shape[row][col]) {
          const boardX = x + col;
          const boardY = y + row;

          if (
            boardX < 0 ||
            boardX >= BOARD_WIDTH ||
            boardY >= BOARD_HEIGHT ||
            (boardY >= 0 && board[boardY][boardX] !== 0)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  getGhostPosition(board: number[][]): { x: number; y: number } {
    let ghostY = this.y;

    while (!this.collides(board, this.x, ghostY + 1)) {
      ghostY++;
    }

    return { x: this.x, y: ghostY };
  }

  placeOnBoard(board: number[][]): void {
    for (let row = 0; row < this.shape.length; row++) {
      for (let col = 0; col < this.shape[row].length; col++) {
        if (this.shape[row][col]) {
          const boardY = this.y + row;
          const boardX = this.x + col;

          if (boardY >= 0) {
            board[boardY][boardX] = this.color;
          }
        }
      }
    }
  }
}

export class Game {
  public board: number[][];
  public currentPiece: Tetromino | null;
  public nextPiece: Tetromino;

  public score: number;
  public level: number;
  public lines: number;

  public dropTime: number;
  public lastDrop: number;

  public gameOver: boolean;
  public paused: boolean;

  constructor() {
    this.board = Array.from({ length: BOARD_HEIGHT }, () =>
      Array(BOARD_WIDTH).fill(0)
    );

    this.currentPiece = null;
    this.nextPiece = this.generateRandomPiece();

    this.score = 0;
    this.level = 1;
    this.lines = 0;

    this.dropTime = INITIAL_DROP_TIME;
    this.lastDrop = 0;

    this.gameOver = false;
    this.paused = false;

    this.spawnPiece();
  }

  generateRandomPiece(): Tetromino {
    const types: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    const type = types[Math.floor(Math.random() * types.length)];

    return new Tetromino(
      type,
      Math.floor(BOARD_WIDTH / 2) -
        Math.floor(TETROMINO_SHAPES[type][0].length / 2),
      -1
    );
  }

  spawnPiece(): void {
    this.currentPiece = this.nextPiece;
    this.nextPiece = this.generateRandomPiece();

    if (this.currentPiece.collides(this.board)) {
      this.gameOver = true;
    }
  }

  movePiece(dx: number, dy: number): boolean {
    if (!this.currentPiece) return false;

    const newX = this.currentPiece.x + dx;
    const newY = this.currentPiece.y + dy;

    if (!this.currentPiece.collides(this.board, newX, newY)) {
      this.currentPiece.x = newX;
      this.currentPiece.y = newY;
      return true;
    }

    return false;
  }

  rotatePiece(): void {
    if (!this.currentPiece) return;

    const originalShape = this.currentPiece.shape.map(row => [...row]);

    this.currentPiece.rotate();

    const offsets = [0, -1, 1, -2, 2];

    for (let offset of offsets) {
      if (!this.currentPiece.collides(this.board, this.currentPiece.x + offset, this.currentPiece.y)) {
        this.currentPiece.x += offset;
        return;
      }
    }

    this.currentPiece.shape = originalShape;
  }

  dropPiece(): void {
    if (!this.currentPiece) return;

    if (!this.movePiece(0, 1)) {
      this.currentPiece.placeOnBoard(this.board);
      this.clearLines();
      this.spawnPiece();
    }
  }

  softDrop(): void {
    if (!this.currentPiece) return;

    this.movePiece(0, 1);
  }

  hardDrop(): void {
    if (!this.currentPiece) return;

    while (this.movePiece(0, 1)) {
    }

    this.currentPiece.placeOnBoard(this.board);
    this.clearLines();
    this.spawnPiece();
  }

  clearLines(): void {
    let linesCleared = 0;

    for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
      if (this.board[row].every(cell => cell !== 0)) {
        this.board.splice(row, 1);
        this.board.unshift(Array(BOARD_WIDTH).fill(0));
        linesCleared++;
        row++;
      }
    }

    if (linesCleared > 0) {
        this.lines += linesCleared;
        this.score += linesCleared * 100;

        this.level = Math.floor(this.lines / LINES_PER_LEVEL) + 1;

        this.dropTime =
            INITIAL_DROP_TIME *
            Math.pow(LEVEL_SPEED_INCREASE, this.level - 1);
    }
  }

  update(time: number): void {
    if (this.gameOver || this.paused || !this.currentPiece) return;

    if (time - this.lastDrop > this.dropTime) {
      this.dropPiece();
      this.lastDrop = time;
    }
  }
}