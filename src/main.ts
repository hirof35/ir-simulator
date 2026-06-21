// 物質の特性を定義するインターフェース
interface Material {
  thermalConductivity: number; // 熱伝導率
  specificHeat: number;        // 比熱容量
  absorptionRate: number;      // 赤外線吸収率 (0.0 ~ 1.0)
}

// グリッドの一つのセル（対象オブジェクトの最小単位）
interface Cell {
  x: number;
  y: number;
  temperature: number;       // 現在の温度 (℃)
  material: Material;
}

// 赤外線光源
interface IRSource {
  x: number;
  y: number;
  intensity: number;         // 光源の強さ
  range: number;             // 届く距離
}

class IRSimulator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cells: Cell[][] = [];
  private source: IRSource;
  
  private readonly cols = 40;
  private readonly rows = 30;
  private readonly cellSize = 15;
  private readonly ambientTemp = 25.0; // 室温 (25℃)

  constructor(canvasId: string) {
      this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
      this.ctx = this.canvas.getContext('2d')!;
      
      // 光源の初期化（画面中央上部）
      this.source = { x: 300, y: 50, intensity: 800, range: 300 };
      
      this.initGrid();
      this.setupEvents();
  }

  // グリッド（対象物）の初期化
  private initGrid() {
      // 鉄に似た特性の物質を設定
      const iron: Material = { thermalConductivity: 0.15, specificHeat: 0.45, absorptionRate: 0.85 };
      
      for (let x = 0; x < this.cols; x++) {
          this.cells[x] = [];
          for (let y = 0; y < this.rows; y++) {
              this.cells[x][y] = {
                  x: x * this.cellSize,
                  y: y * this.cellSize + 150, // 光源より下に配置
                  temperature: this.ambientTemp,
                  material: iron
              };
          }
      }
  }

  // マウス移動で光源の位置を更新
  private setupEvents() {
      this.canvas.addEventListener('mousemove', (e) => {
          const rect = this.canvas.getBoundingClientRect();
          this.source.x = e.clientX - rect.left;
          this.source.y = e.clientY - rect.top;
      });
  }

  // 物理演算の更新 (毎フレーム実行)
  public update(dt: number) {
      // 1. 赤外線による加熱と自然冷却
      for (let x = 0; x < this.cols; x++) {
          for (let y = 0; y < this.rows; y++) {
              const cell = this.cells[x][y];
              
              // 光源からの距離を計算
              const dx = cell.x + this.cellSize / 2 - this.source.x;
              const dy = cell.y + this.cellSize / 2 - this.source.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < this.source.range && distance > 10) {
                  // 距離の逆二乗に比例してエネルギーが減衰
                  const irradiance = this.source.intensity / (distance * distance);
                  const energyAbsorbed = irradiance * cell.material.absorptionRate * dt;
                  cell.temperature += energyAbsorbed / cell.material.specificHeat;
              }

              // 自然冷却 (空気への放熱)
              const cooling = (cell.temperature - this.ambientTemp) * 0.02 * dt;
              cell.temperature -= cooling;
          }
      }

      // 2. 熱伝導 (隣り合うセル同士での熱の移動)
      const nextTemperatures = this.cells.map(row => row.map(c => c.temperature));
      
      for (let x = 1; x < this.cols - 1; x++) {
          for (let y = 1; y < this.rows - 1; y++) {
              const cell = this.cells[x][y];
              const k = cell.material.thermalConductivity * dt;
              
              const dT = (
                  this.cells[x+1][y].temperature +
                  this.cells[x-1][y].temperature +
                  this.cells[x][y+1].temperature +
                  this.cells[x][y-1].temperature -
                  4 * cell.temperature
              );
              
              nextTemperatures[x][y] += dT * k;
          }
      }

      // 計算結果を現在のグリッドに反映
      for (let x = 0; x < this.cols; x++) {
          for (let y = 0; y < this.rows; y++) {
              this.cells[x][y].temperature = Math.min(150, nextTemperatures[x][y]); // 上限を150℃に制限
          }
      }
  }

  // 描画処理
  public render() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // グリッド（サーモグラフィ風の描画）
      for (let x = 0; x < this.cols; x++) {
          for (let y = 0; y < this.rows; y++) {
              const cell = this.cells[x][y];
              // 温度(25℃〜125℃)を色相(240青〜0赤)にマッピング
              const tempOffset = cell.temperature - this.ambientTemp;
              const hue = Math.max(0, 240 - tempOffset * 2.4); 
              
              this.ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
              this.ctx.fillRect(cell.x, cell.y, this.cellSize - 1, this.cellSize - 1);
          }
      }

      // 赤外線の照射範囲（うっすらとした赤い同心円）
      this.ctx.beginPath();
      this.ctx.arc(this.source.x, this.source.y, this.source.range, 0, Math.PI * 2);
      this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.15)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // 赤外線光源（中心点）
      this.ctx.beginPath();
      this.ctx.arc(this.source.x, this.source.y, 6, 0, Math.PI * 2);
      this.ctx.fillStyle = '#ff3333';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = 'red';
      this.ctx.fill();
      this.ctx.shadowBlur = 0; // シャドウのリセット
  }

  // ループ開始
  public start() {
      const loop = () => {
          this.update(0.1); // タイムステップ dt
          this.render();
          requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
  }
}

// 初期化
const sim = new IRSimulator('irSim');
sim.start();