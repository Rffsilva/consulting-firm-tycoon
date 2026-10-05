# Consulting Firm Tycoon

A small browser tycoon game. You are the owner of a new consulting firm: take on client projects, hire people with the right skills, and keep the company in business.

**Play it:** https://rffsilva.github.io/consulting-firm-tycoon/

It is plain HTML, CSS and JavaScript. There is nothing to install or build, and it works on desktop and phones.

## Running it yourself

Download or clone the repository and open `index.html` in a modern browser.

If your browser objects to opening the file directly, serve the folder instead and open <http://localhost:8000>:

```bash
python3 -m http.server 8000
```

To try it on a phone on the same Wi-Fi, run the same command and open `http://<your computer's IP>:8000` on the phone.

## Controls

| | Desktop | Phone |
|---|---|---|
| Walk | Click the floor, or WASD / arrow keys | Tap the floor |
| Open a desk, board or station | Click it, or stand next to it and press **E** | Tap it, or tap the prompt that appears |
| Close a window | **Esc** or the ✕ | The ✕ |

New to the game? Press **How to play** at the top for a short guide to the goal, the controls and what each role does. It also opens by itself the first time you play.

Every window can also be opened from the buttons at the top of the screen. The game pauses while a window is open and resumes at the previous speed when you close it. Use the speed buttons (⏸, 1×, 2×, 4×) to control the clock.

## How the game works

- **Clients** post requests on the board. Each one needs points in certain skills (Strategy, Analytics, Technology, Finance, Operations), and each skill has a minimum level someone must have to work on it. Accept the ones your team can handle.
- **People** produce points per day equal to their skill level. Hire from the recruiting desk, train staff to raise their levels, and assign them to projects. The **You** card in the side panel puts you on a project too.
- **Deadlines and money:** deliver on time for the reward and reputation (with a small bonus for finishing early). Missing a deadline costs a fine and reputation. Wages and rent are paid every 30 days, and you go bankrupt below -$5,000.
- **Reputation** unlocks bigger, harder contracts and better candidates.
- **Desks** limit your headcount. Expand the office from the facilities table.

### Special staff

- **Managers** assign idle staff to projects automatically. Each has a Management level that sets how many people they can handle. Anyone you assign yourself is left alone.
- **Strategy** (boardroom): chooses how managers prioritise projects: protect deadlines, maximise revenue, or first come first served.
- **HR specialist:** lists accepted projects that can't be completed, either because nobody has a required skill level or because even everyone qualified can't finish in time, and suggests who to train (or hire). Idle people are preferred for training, since they have no work to lose, and the window lists who is idle. With no accepted projects, it points at skills the company is lacking.

## Working on the code

The code is organised by purpose, with one file per kind of employee and one per window:

```
css/              styles: base pieces, screen layout, pop-up windows
js/core/          settings (config.js holds every balance number), names, helpers, the game state and saving
js/sim/           game rules: projects, player actions, the daily simulation
js/employees/     one file per employee type: owner, consultant, manager, hr
js/ui/            the HTML windows and side panel (one file per window in ui/panels/)
js/office/        the 2D office: map, drawing, player movement, interaction
tests/            tests for the game rules
docs/             developer documentation
```

- **Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first.** It explains how the files fit together, how a simulated day works, and step by step how to add a new employee type or window.
- **To tune the game**, change the numbers in `js/core/config.js`.
- **To run the tests**, open `tests/index.html` in a browser. There is nothing to install.
- There is no build step. Scripts are plain `<script>` tags in `index.html`, in dependency order, and each one registers itself on a single global, `window.CFT`.

Saves live in the browser's local storage, so each browser and device has its own game.

## Deployment

Pushing to `main` publishes the game with GitHub Pages (see `.github/workflows/pages.yml`). The workflow copies `index.html`, `css/` and `js/` into a `public` folder and deploys it. New files inside those folders are published automatically.

One-time setup in the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
