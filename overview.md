# Wart Bunker Game Overview (Space Story Wallet Game)

## Project Structure
- Astro + React + Tailwind project
- Main entry: `src/pages/index.astro` loads `Wallet.jsx`
- Core: `src/components/wallet.jsx` -> `GameInterface.jsx` + `useWallet.js`
- Current directory: `/home/whitefang/webdev/wartbunkergame`

## Key Features
- **Main Screen**: 5 sectors with player movement (WASD/E or joystick)
  - Sectors: Wallet Mgmt, Node Options, Validate Addr, Send Tx, Space Station
  - Interact with E to open modals
- **Space Station**: Leads to zone selection
- **3 Story Zones**: Exploration, Combat, Trade
  - Unique backgrounds
  - Story HUD at bottom
  - Story counters to advance narrative (choose-your-own-adventure)
  - No main modals/counters shown in zones
- **Wallet Integration**: Balance HUD, modals for crypto functions

## Key Files
1. **src/components/GameInterface.jsx** - Main game logic, player, counters, zones
2. **src/components/wallet.jsx** - Entry point, modals
3. **src/components/useWallet.js** - Wallet state and functions
4. **src/components/GameInterface.css** - Styling, positions, backgrounds
5. **src/pages/index.astro** - Page entry

## Recent Changes
- Space Station positioned at right: 250px, top: 10px, large (160x160), z-index: 25
- Main counters hidden in zones via CSS
- Zone counters conditional on progress
- Story progression with handleZoneAction

## To Run
```
npm run dev
```

## Current Issues Fixed
- No main counters in zones
- Space Station easy interaction (larger area)
- Seamless zone loading with player

## Todo
- More story branches per zone
- Wallet integration in story (e.g., balance requirements for choices)

Copy this overview to other Grok instances for context.
