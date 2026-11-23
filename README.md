# GOO GAME PLAY

**Play Instantly. Anywhere. Anytime.**

GOO GAME PLAY is a production-ready global HTML5 mini-games arcade built with React, TypeScript, Tailwind CSS, Express, and Vite PWA.

## Implemented Features

- **10 Playable HTML5 Games** (each lazy-loaded in its own code chunk):
  1. Snake Arcade (`snake`)
  2. 2048 Neon Merge (`2048`)
  3. Tetris Block Stacker (`tetris`)
  4. Sky Hopper (`flappy-bird`)
  5. Tic Tac Toe Pro (`tic-tac-toe`) — 2-player local + Easy/Medium/Minimax Hard AI
  6. Memory Matrix (`memory-match`)
  7. Mine Sweeper (`minesweeper`)
  8. Brick Breaker (`breakout`)
  9. Sudoku Master (`sudoku`)
  10. 15 Slide Puzzle (`15-puzzle`)
- **22 Languages + RTL Support**: English, Hindi, Spanish, Portuguese, French, German, Arabic (RTL), Chinese Simplified, Japanese, Korean, Russian, Indonesian, Bengali, Urdu (RTL), Turkish, Italian, Vietnamese, Thai, Punjabi, Marathi, Tamil, Telugu.
- **PWA & Android App-Like Experience**: Installable manifest, Workbox offline caching, safe-area support, touch-locked game arenas, auto-pause on tab switch, synthesized Web Audio effects, and haptic feedback.
- **Global SEO & Sitemaps**: Server-injected unique `<title>`, `<meta description>`, canonical URLs, `hreflang` + `x-default`, OpenGraph/Twitter cards, JSON-LD (`Organization`, `WebSite`, `WebApplication`, `VideoGame`, `BreadcrumbList`), `/robots.txt`, `/sitemap.xml`, and `/sitemap-:lang.xml`.
- **Monetag Direct Link Integration**: Central configuration (`https://uplcm.com/4/12282219`) with clear disclosure and user opt-out outside active gameplay.
- **Protected Admin Console**: `/:lang/admin/` protected by `ADMIN_PASSCODE` or one-time salted `scrypt` setup claim + Bearer token verification.

## Scripts

- `npm run dev` — Starts full-stack Express + Vite dev server on port 3000
- `npm run build` — Builds production client bundle into `dist/`
- `npm run start` — Starts production Express server (`node server.ts`)
- `npm run lint` — Runs TypeScript check (`tsc --noEmit`)
- `node --test tests/app.test.ts` — Runs automated unit test suite
