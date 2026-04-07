import Phaser from 'phaser';
import { Game } from './game';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  BLOCK_SIZE,
  COLORS,
} from './constants';

class TetrisScene extends Phaser.Scene {
  private game!: Game;
  private boardRects: Phaser.GameObjects.Rectangle[][] = [];
  private ghostRects: Phaser.GameObjects.Rectangle[][] = [];
  private nextPieceRects: Phaser.GameObjects.Rectangle[][] = [];

  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private downKey!: Phaser.Input.Keyboard.Key;
  private upKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private pKey!: Phaser.Input.Keyboard.Key;
  private rKey!: Phaser.Input.Keyboard.Key;

  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private pauseButton!: Phaser.GameObjects.Rectangle;
  private pauseText!: Phaser.GameObjects.Text;

  private gameOverPanel!: Phaser.GameObjects.Rectangle;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartButton!: Phaser.GameObjects.Rectangle;
  private restartText!: Phaser.GameObjects.Text;

  private offsetX = 80;
  private offsetY = 30;

  private moveLeftTimer: number = 0;
  private moveRightTimer: number = 0;
  private softDropTimer: number = 0;
  private lastMoveTime: number = 0;

  constructor() {
    super('TetrisScene');
  }

  createPanel(x: number, y: number, w: number, h: number, title: string = '') {
    this.add.rectangle(x + 6, y + 8, w, h, 0x000000, 0.25).setOrigin(0);
    const panel = this.add.rectangle(x, y, w, h, 0x1e1e2b)
      .setOrigin(0)
      .setStrokeStyle(6, 0x8888aa);
    this.add.rectangle(x + 3, y + 3, w - 6, h - 6, 0x1e1e2b)
      .setOrigin(0)
      .setStrokeStyle(2, 0xbbbbdd);

    if (title) {
      this.add.text(x + w / 2, y - 30, title.toUpperCase(), {
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#000000'
      }).setOrigin(0.5);
    }
    return panel;
  }

  create() {
    this.game = new Game();
    this.cameras.main.setBackgroundColor('#f0f0f5');

    this.add.rectangle(
      this.offsetX + (BOARD_WIDTH * BLOCK_SIZE) / 2,
      this.offsetY + (BOARD_HEIGHT * BLOCK_SIZE) / 2 + 10,
      BOARD_WIDTH * BLOCK_SIZE + 50,
      BOARD_HEIGHT * BLOCK_SIZE + 50,
      0x111122
    ).setStrokeStyle(8, 0x555577);

    for (let row = 0; row < BOARD_HEIGHT; row++) {
      this.boardRects[row] = [];
      this.ghostRects[row] = [];
      for (let col = 0; col < BOARD_WIDTH; col++) {
        const x = this.offsetX + col * BLOCK_SIZE + BLOCK_SIZE / 2;
        const y = this.offsetY + row * BLOCK_SIZE + BLOCK_SIZE / 2;

        const rect = this.add.rectangle(x, y, BLOCK_SIZE - 1, BLOCK_SIZE - 1, COLORS.EMPTY)
          .setStrokeStyle(1, 0x333344);

        const ghost = this.add.rectangle(x, y, BLOCK_SIZE - 4, BLOCK_SIZE - 4, 0x88aaff)
          .setAlpha(0.25).setStrokeStyle(2, 0x88aaff).setVisible(false);

        this.boardRects[row][col] = rect;
        this.ghostRects[row][col] = ghost;
      }
    }

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x444455, 0.6);
    for (let i = 0; i <= BOARD_WIDTH; i++) {
      const x = this.offsetX + i * BLOCK_SIZE;
      grid.moveTo(x, this.offsetY);
      grid.lineTo(x, this.offsetY + BOARD_HEIGHT * BLOCK_SIZE);
    }
    for (let i = 0; i <= BOARD_HEIGHT; i++) {
      const y = this.offsetY + i * BLOCK_SIZE;
      grid.moveTo(this.offsetX, y);
      grid.lineTo(this.offsetX + BOARD_WIDTH * BLOCK_SIZE, y);
    }
    grid.stroke();

    const panelX = this.offsetX + BOARD_WIDTH * BLOCK_SIZE + 90;

    this.createPanel(panelX, 80, 170, 190, 'NEXT');

    for (let row = 0; row < 4; row++) {
      this.nextPieceRects[row] = [];
      for (let col = 0; col < 4; col++) {
        const x = panelX + 35 + col * BLOCK_SIZE;
        const y = 115 + row * BLOCK_SIZE;
        const rect = this.add.rectangle(x, y, BLOCK_SIZE, BLOCK_SIZE, COLORS.EMPTY);
        this.nextPieceRects[row][col] = rect;
      }
    }

    this.createPanel(panelX, 350, 170, 140, 'SCORE');

    this.add.text(panelX + 85, 375, 'SCORE', { fontSize: '15px', color: '#aaaaaa' }).setOrigin(0.5);
    this.scoreText = this.add.text(panelX + 85, 405, '0', { 
      fontSize: '26px', color: '#ffffff', fontStyle: 'bold' 
    }).setOrigin(0.5);

    this.add.text(panelX + 85, 440, 'LEVEL', { fontSize: '15px', color: '#aaaaaa' }).setOrigin(0.5);
    this.levelText = this.add.text(panelX + 85, 460, '1', { 
      fontSize: '21px', color: '#ffffff' 
    }).setOrigin(0.5);

    this.createPanel(panelX, 570, 170, 180, 'CONTROLS');

    const startX = panelX + 22;
    const startY = 595;
    const lineHeight = 23;

    this.add.text(startX, startY, '←  →', { fontSize: '15px', color: '#ffffff' });
    this.add.text(startX + 58, startY, 'Move', { fontSize: '13px', color: '#bbbbbb' });

    this.add.text(startX, startY + lineHeight, '↓', { fontSize: '15px', color: '#ffffff' });
    this.add.text(startX + 58, startY + lineHeight, 'Soft Drop', { fontSize: '13px', color: '#bbbbbb' });

    this.add.text(startX, startY + lineHeight * 2, '↑', { fontSize: '15px', color: '#ffffff' });
    this.add.text(startX + 58, startY + lineHeight * 2, 'Rotate', { fontSize: '13px', color: '#bbbbbb' });

    this.add.text(startX, startY + lineHeight * 3, 'Space', { fontSize: '13px', color: '#ffffff' });
    this.add.text(startX + 58, startY + lineHeight * 3, 'Hard Drop', { fontSize: '13px', color: '#bbbbbb' });

    this.add.text(startX, startY + lineHeight * 4, 'R', { fontSize: '13px', color: '#ffffff' });
    this.add.text(startX + 58, startY + lineHeight * 4, 'Restart', { fontSize: '13px', color: '#bbbbbb' });

    this.add.text(startX, startY + lineHeight * 5, 'P', { fontSize: '13px', color: '#ffffff' });
    this.add.text(startX + 58, startY + lineHeight * 5, 'Pause', { fontSize: '13px', color: '#bbbbbb' });


    this.pauseButton = this.add.rectangle(230, 800, 140, 48, 0x00bb66)
      .setStrokeStyle(4, 0xdddddd)
      .setInteractive({ useHandCursor: true });

    this.pauseText = this.add.text(230, 800, 'PAUSE', {
      fontSize: '19px', fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0.5);

    this.pauseButton.on('pointerdown', () => {
      this.game.paused = !this.game.paused;
      this.pauseText.setText(this.game.paused ? 'RESUME' : 'PAUSE');
      this.pauseButton.setFillStyle(this.game.paused ? 0xff8800 : 0x00bb66);
    });

    this.gameOverPanel = this.add.rectangle(380, 360, 400, 200, 0x000000, 0.9)
      .setOrigin(0.5)
      .setStrokeStyle(4, 0xff0000)
      .setVisible(false);

    this.gameOverText = this.add.text(380, 310, 'GAME OVER', {
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#ff0000'
    }).setOrigin(0.5).setVisible(false);

    this.restartButton = this.add.rectangle(380, 380, 150, 50, 0x00bb66)
      .setStrokeStyle(3, 0xdddddd)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);

    this.restartText = this.add.text(380, 380, 'RESTART', {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setVisible(false);

    this.restartButton.on('pointerdown', () => {
      this.resetGame();
    });

    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.input.keyboard!.on('keydown-ENTER', () => {
      if (this.game.gameOver) {
        this.resetGame();
      }
    });

    this.leftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.rightKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.downKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.upKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.pKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
  }


  drawBoard() {
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      for (let col = 0; col < BOARD_WIDTH; col++) {
        this.boardRects[row][col].setFillStyle(this.game.board[row][col] || COLORS.EMPTY);
      }
    }

    const piece = this.game.currentPiece;
    if (!piece) return;

    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          const br = piece.y + r;
          const bc = piece.x + c;
          if (br >= 0 && br < BOARD_HEIGHT && bc >= 0 && bc < BOARD_WIDTH) {
            this.boardRects[br][bc].setFillStyle(piece.color);
          }
        }
      }
    }
  }

  drawGhost() { 
    this.ghostRects.flat().forEach(g => g.setVisible(false));
    const piece = this.game.currentPiece;
    if (!piece) return;

    const ghost = piece.getGhostPosition(this.game.board);

    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          const br = ghost.y + r;
          const bc = ghost.x + c;
          if (br >= 0 && br < BOARD_HEIGHT && bc >= 0 && bc < BOARD_WIDTH) {
            this.ghostRects[br][bc].setVisible(true);
          }
        }
      }
    }
  }

  drawNextPiece() {
    this.nextPieceRects.flat().forEach(r => r.setFillStyle(COLORS.EMPTY));

    const shape = this.game.nextPiece.shape;
    const color = this.game.nextPiece.color;

    let offsetX = Math.floor((4 - shape[0].length) / 2);
    let offsetY = Math.floor((4 - shape.length) / 2);

    if (shape.length === 1) offsetY = 1;
    if (shape[0].length === 4) offsetX = 0;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          this.nextPieceRects[offsetY + r][offsetX + c].setFillStyle(color);
        }
      }
    }
  }

  showGameOver() {
    this.gameOverPanel.setVisible(true);
    this.gameOverText.setVisible(true);
    this.restartButton.setVisible(true);
    this.restartText.setVisible(true);
  }

  resetGame() {
    this.game = new Game();
    this.gameOverPanel.setVisible(false);
    this.gameOverText.setVisible(false);
    this.restartButton.setVisible(false);
    this.restartText.setVisible(false);
    this.pauseText.setText('PAUSE');
    this.pauseButton.setFillStyle(0x00bb66);
    this.drawBoard();
    this.drawGhost();
    this.drawNextPiece();
    this.updateUI();
  }

  updateUI() {
    this.scoreText.setText(this.game.score.toString());
    this.levelText.setText(this.game.level.toString());
  }

  update(time: number) {
    if (this.game.gameOver) {
      if (!this.gameOverPanel.visible) {
        this.showGameOver();
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
      this.game.paused = !this.game.paused;
      this.pauseText.setText(this.game.paused ? 'RESUME' : 'PAUSE');
      this.pauseButton.setFillStyle(this.game.paused ? 0xff8800 : 0x00bb66);
    }

    if (this.game.paused) return;

    const currentTime = time;

    // === MOVIMIENTO CONTINUO ===
    if (this.leftKey.isDown) {
      if (currentTime - this.moveLeftTimer > 80) {  
        this.game.movePiece(-1, 0);
        this.moveLeftTimer = currentTime;
      }
    } else {
      this.moveLeftTimer = 0;
    }

    if (this.rightKey.isDown) {
      if (currentTime - this.moveRightTimer > 80) {
        this.game.movePiece(1, 0);
        this.moveRightTimer = currentTime;
      }
    } else {
      this.moveRightTimer = 0;
    }

    if (this.downKey.isDown) {
      if (currentTime - this.softDropTimer > 50) {  
        this.game.softDrop();
        this.softDropTimer = currentTime;
      }
    } else {
      this.softDropTimer = 0;
    }

    if (Phaser.Input.Keyboard.JustDown(this.upKey)) this.game.rotatePiece();
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) this.game.hardDrop();
    if (Phaser.Input.Keyboard.JustDown(this.pKey)) {
      this.game.paused = !this.game.paused;
      this.pauseText.setText(this.game.paused ? 'RESUME' : 'PAUSE');
      this.pauseButton.setFillStyle(this.game.paused ? 0xff8800 : 0x00bb66);
    }

    this.game.update(time);

    this.drawBoard();
    this.drawGhost();
    this.drawNextPiece();
    this.updateUI();
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 760,
  height: 900,
  scene: TetrisScene,
  backgroundColor: '#f0f0f5',
};

new Phaser.Game(config);