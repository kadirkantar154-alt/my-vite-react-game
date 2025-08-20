
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCcw, RotateCcw, Sparkles } from "lucide-react";

// ——————————————————————————————————————————————————————
// Merge Crush — a 2048 × Match‑3 hybrid
// Single-file React component. Uses Tailwind for styling.
// Premium, minimalist look with smooth animations.
// ——————————————————————————————————————————————————————

// Config
const SIZE = 6; // grid size (6×6 feels great)
const STARTING_FILLS = SIZE * SIZE; // fill all at start
const START_VALUES = [2, 2, 2, 4, 4, 8, 16]; // skew toward lower values
const MIN_MATCH = 3;

// Utility helpers
const id = (() => {
  let i = 0;
  return () => ++i;
})();

const randFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const inBounds = (x, y) => x >= 0 && x < SIZE && y >= 0 && y < SIZE;

const dirs = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function createTile(value, x, y) {
  return { id: id(), value, x, y, born: Date.now() };
}

function emptyBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

function cloneBoard(board) {
  return board.map((row) => row.map((t) => (t ? { ...t } : null)));
}

function* positions() {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) yield [x, y];
  }
}

// Color palette for values (minimalist, premium)
function tileColor(value) {
  const palette = [
    { bg: "bg-zinc-100", text: "text-zinc-700", ring: "ring-zinc-300" }, // 2
    { bg: "bg-zinc-200", text: "text-zinc-800", ring: "ring-zinc-300" }, // 4
    { bg: "bg-emerald-100", text: "text-emerald-900", ring: "ring-emerald-300" }, // 8
    { bg: "bg-emerald-200", text: "text-emerald-900", ring: "ring-emerald-300" }, // 16
    { bg: "bg-cyan-200", text: "text-cyan-900", ring: "ring-cyan-300" }, // 32
    { bg: "bg-cyan-300", text: "text-cyan-900", ring: "ring-cyan-400" }, // 64
    { bg: "bg-indigo-300", text: "text-indigo-900", ring: "ring-indigo-400" }, // 128
    { bg: "bg-violet-400", text: "text-violet-950", ring: "ring-violet-500" }, // 256
    { bg: "bg-fuchsia-400", text: "text-fuchsia-950", ring: "ring-fuchsia-500" }, // 512
    { bg: "bg-rose-400", text: "text-rose-950", ring: "ring-rose-500" }, // 1024
    { bg: "bg-amber-400", text: "text-amber-950", ring: "ring-amber-500" }, // 2048+
  ];
  const idx = Math.min(
    palette.length - 1,
    Math.floor(Math.log2(value)) - 1
  );
  return palette[Math.max(0, idx)];
}

function hasAnyMatches(board) {
  return findAllMatches(board).length > 0;
}

function valueAfterMerge(baseValue, count) {
  // For k in [3..], merge result = base * 2^(k-2)
  return baseValue * Math.pow(2, Math.max(0, count - 2));
}

function findAllMatches(board) {
  // Returns array of match groups; each group: { value, cells: [[x,y], ...] }
  const matches = [];

  // Horizontal
  for (let y = 0; y < SIZE; y++) {
    let x = 0;
    while (x < SIZE) {
      const tile = board[y][x];
      if (!tile) {
        x++;
        continue;
      }
      const value = tile.value;
      let run = [[x, y]];
      let x2 = x + 1;
      while (x2 < SIZE && board[y][x2] && board[y][x2].value === value) {
        run.push([x2, y]);
        x2++;
      }
      if (run.length >= MIN_MATCH) {
        matches.push({ value, cells: run });
      }
      x = x2;
    }
  }
  // Vertical
  for (let x = 0; x < SIZE; x++) {
    let y = 0;
    while (y < SIZE) {
      const tile = board[y][x];
      if (!tile) {
        y++;
        continue;
      }
      const value = tile.value;
      let run = [[x, y]];
      let y2 = y + 1;
      while (y2 < SIZE && board[y2][x] && board[y2][x].value === value) {
        run.push([x, y2]);
        y2++;
      }
      if (run.length >= MIN_MATCH) {
        matches.push({ value, cells: run });
      }
      y = y2;
    }
  }

  // Deduplicate overlapping cells by merging groups that share cells
  if (matches.length <= 1) return matches;
  const merged = [];
  const used = new Array(matches.length).fill(false);
  for (let i = 0; i < matches.length; i++) {
    if (used[i]) continue;
    let group = { value: matches[i].value, cells: new Set(matches[i].cells.map((c) => c.toString())) };
    used[i] = true;
    let changed = true;
    while (changed) {
      changed = false;
      for (let j = 0; j < matches.length; j++) {
        if (used[j]) continue;
        const intersects = matches[j].cells.some((c) => group.cells.has(c.toString()));
        if (intersects && matches[j].value === matches[i].value) {
          matches[j].cells.forEach((c) => group.cells.add(c.toString()));
          used[j] = true;
          changed = true;
        }
      }
    }
    merged.push({ value: matches[i].value, cells: Array.from(group.cells).map((s) => s.split(",").map(Number)) });
  }
  return merged;
}

function applyGravity(board) {
  // Make tiles fall down to fill nulls
  for (let x = 0; x < SIZE; x++) {
    let writeY = SIZE - 1;
    for (let y = SIZE - 1; y >= 0; y--) {
      if (board[y][x]) {
        if (y !== writeY) {
          board[writeY][x] = { ...board[y][x], x, y: writeY };
          board[y][x] = null;
        } else {
          board[y][x] = { ...board[y][x], x, y };
        }
        writeY--;
      }
    }
    for (let y = writeY; y >= 0; y--) board[y][x] = null;
  }
}

function fillNewTiles(board) {
  for (let [x, y] of positions()) {
    if (!board[y][x]) {
      board[y][x] = createTile(randFrom(START_VALUES), x, y);
    }
  }
}

function canMakeAnySwap(board) {
  // Check if any adjacent swap yields a match
  for (let [x, y] of positions()) {
    for (let [dx, dy] of dirs) {
      const x2 = x + dx,
        y2 = y + dy;
      if (!inBounds(x2, y2)) continue;
      if (board[y][x] && board[y2][x2]) {
        const b = cloneBoard(board);
        const t1 = b[y][x];
        const t2 = b[y2][x2];
        b[y][x] = { ...t2, x, y };
        b[y2][x2] = { ...t1, x: x2, y: y2 };
        if (findAllMatches(b).length > 0) return true;
      }
    }
  }
  return false;
}

function shuffleBoard(board) {
  const tiles = [];
  for (let [x, y] of positions()) if (board[y][x]) tiles.push(board[y][x]);
  // Fisher-Yates
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  const b = emptyBoard();
  let k = 0;
  for (let [x, y] of positions()) {
    const t = tiles[k++];
    b[y][x] = { ...t, x, y };
  }
  return b;
}

export default function App() {
  const [board, setBoard] = useState(() => {
    const b = emptyBoard();
    let placed = 0;
    while (placed < STARTING_FILLS) {
      const [x, y] = [placed % SIZE, Math.floor(placed / SIZE)];
      b[y][x] = createTile(randFrom(START_VALUES), x, y);
      placed++;
    }
    // Avoid starting with auto-matches to give player control
    while (hasAnyMatches(b)) {
      const nb = shuffleBoard(b);
      for (let [x, y] of positions()) b[y][x] = nb[y][x];
    }
    return b;
  });

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [moves, setMoves] = useState(0);
  const [selected, setSelected] = useState(null); // {x,y}
  const [busy, setBusy] = useState(false);
  const [combo, setCombo] = useState(0);

  useEffect(() => {
    setBest((b) => Math.max(b, score));
  }, [score]);

  // Swap logic
  const trySwap = async (a, bpos) => {
    if (busy) return;
    if (!a || !bpos) return;
    const { x: x1, y: y1 } = a;
    const { x: x2, y: y2 } = bpos;
    const isAdj = Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1;
    if (!isAdj) {
      setSelected(bpos);
      return;
    }
    setBusy(true);

    setBoard((prev) => {
      const b = cloneBoard(prev);
      const t1 = b[y1][x1];
      const t2 = b[y2][x2];
      b[y1][x1] = { ...t2, x: x1, y: y1 };
      b[y2][x2] = { ...t1, x: x2, y: y2 };
      return b;
    });

    await sleep(120);
    let matches = findAllMatches(boardAfter());
    if (matches.length === 0) {
      // Revert if no match
      setBoard((prev) => {
        const b = cloneBoard(prev);
        const t1 = b[y1][x1];
        const t2 = b[y2][x2];
        b[y1][x1] = { ...t2, x: x1, y: y1 };
        b[y2][x2] = { ...t1, x: x2, y: y2 };
        return b;
      });
      await sleep(120);
      setSelected(null);
      setBusy(false);
      return;
    }

    setMoves((m) => m + 1);
    await resolveCascades();
    setSelected(null);
    setBusy(false);
  };

  const boardAfter = () => {
    // Access the very latest board from React state (synchronously) via ref trick
    // We'll copy state into a ref on every render.
    return boardRef.current;
  };

  const boardRef = useRef(board);
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  async function resolveCascades() {
    let localCombo = 0;
    while (true) {
      const matches = findAllMatches(boardAfter());
      if (matches.length === 0) break;
      localCombo++;
      setCombo(localCombo);

      // Remove matched tiles, spawn merged tile for each group
      const updated = cloneBoard(boardAfter());
      let gained = 0;

      for (const group of matches) {
        const { value, cells } = group;
        const mergedValue = valueAfterMerge(value, cells.length);

        // Choose a gravity-friendly target cell: the lowest y among cells
        const target = cells.reduce((p, c) => (c[1] > p[1] ? c : p), cells[0]);

        // Clear all
        for (const [x, y] of cells) updated[y][x] = null;

        // Place merged tile at target
        const [tx, ty] = target;
        updated[ty][tx] = createTile(mergedValue, tx, ty);
        gained += mergedValue;
      }

      setScore((s) => s + gained * localCombo); // combo multiplier

      // Gravity
      applyGravity(updated);
      setBoard(updated);
      await sleep(160);

      // Fill new tiles
      const filled = cloneBoard(updated);
      fillNewTiles(filled);
      setBoard(filled);
      await sleep(160);
    }
    setCombo(0);

    // If no moves available, auto-shuffle once
    if (!canMakeAnySwap(boardAfter())) {
      const nb = shuffleBoard(boardAfter());
      setBoard(nb);
      await sleep(240);
    }
  }

  const onCellClick = (x, y) => {
    if (busy) return;
    if (!selected) setSelected({ x, y });
    else if (selected.x === x && selected.y === y) setSelected(null);
    else trySwap(selected, { x, y });
  };

  const onDragStart = (x, y, e) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ x, y }));
  };
  const onDrop = (x, y, e) => {
    if (busy) return;
    try {
      const from = JSON.parse(e.dataTransfer.getData("text/plain"));
      trySwap(from, { x, y });
    } catch {}
  };

  const resetGame = () => {
    const b = emptyBoard();
    let placed = 0;
    while (placed < STARTING_FILLS) {
      const [x, y] = [placed % SIZE, Math.floor(placed / SIZE)];
      b[y][x] = createTile(randFrom(START_VALUES), x, y);
      placed++;
    }
    while (hasAnyMatches(b)) {
      const nb = shuffleBoard(b);
      for (let [x, y] of positions()) b[y][x] = nb[y][x];
    }
    setBoard(b);
    setScore(0);
    setMoves(0);
    setCombo(0);
    setSelected(null);
  };

  const shuffleAction = () => {
    setBoard((prev) => shuffleBoard(prev));
  };

  const highest = useMemo(() => {
    let h = 0;
    for (let [x, y] of positions()) h = Math.max(h, board[y][x]?.value || 0);
    return h;
  }, [board]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-zinc-50 via-white to-zinc-100 text-zinc-900 flex flex-col items-center py-8 select-none">
      {/* Header */}
      <div className="w-full max-w-[720px] px-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6" /> Merge <span className="font-extrabold">Crush</span>
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Swap adjacent tiles to match <span className="font-medium">3+</span> same values. Matches merge like <span className="font-medium">2048</span>, cascades multiply score.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={shuffleAction} className="px-3 py-2 rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 hover:shadow transition flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" /> Shuffle
            </button>
            <button onClick={resetGame} className="px-3 py-2 rounded-2xl bg-zinc-900 text-white shadow-sm hover:shadow-md transition flex items-center gap-2">
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Stat label="Score" value={score} highlight={combo > 0} />
          <Stat label="Best" value={best} />
          <Stat label="Moves" value={moves} />
        </div>

        {/* Board */}
        <div className="relative aspect-square w-full max-w-[720px] mx-auto">
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gridTemplateRows: `repeat(${SIZE}, 1fr)` }}>
            {/* Grid background cells */}
            {[...positions()].map(([x, y]) => (
              <div key={`bg-${x}-${y}`} className="m-1 rounded-2xl bg-white ring-1 ring-zinc-200 shadow-sm" />
            ))}
          </div>

          {/* Tiles layer */}
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gridTemplateRows: `repeat(${SIZE}, 1fr)` }}>
            {board.flatMap((row, y) =>
              row.map((tile, x) => (
                <div
                  key={`cell-${x}-${y}`}
                  className={`m-1 rounded-2xl relative`}
                  onClick={() => onCellClick(x, y)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDrop(x, y, e)}
                >
                  <AnimatePresence>
                    {tile && (
                      <motion.div
                        key={tile.id}
                        layout
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        draggable
                        onDragStart={(e) => onDragStart(x, y, e)}
                        className={`h-full w-full rounded-2xl ${tileColor(tile.value).bg} ${tileColor(tile.value).text} ring-1 ${tileColor(tile.value).ring} shadow-md flex items-center justify-center font-bold text-xl md:text-2xl relative`}
                      >
                        <span>{tile.value}</span>
                        {selected && selected.x === x && selected.y === y && (
                          <div className="absolute inset-0 rounded-2xl ring-2 ring-black/40 pointer-events-none" />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer / Tips */}
        <div className="mt-4 text-xs text-zinc-500 flex items-center justify-between">
          <div>
            Tip: Click a tile then a neighbor — or drag & drop — to swap. If the swap makes no match, it reverts.
          </div>
          <div>
            Highest tile: <span className="font-medium text-zinc-700">{highest || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div className={`rounded-2xl p-3 bg-white ring-1 ring-zinc-200 shadow-sm ${highlight ? "animate-pulse" : ""}`}>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
