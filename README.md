# Consulting Firm Tycoon

A small browser tycoon game. You are the owner of a new consulting firm: take on client projects, hire people with the right skills, and keep the company in business.

**Play it:** https://rffsilva89.gitlab.io/consulting-firm-tycoon/

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
- **HR specialist:** lists accepted projects that can't be completed, either because nobody has a required skill level or because even everyone qualified can't finish in time, and suggests who to train (or hire). With no accepted projects, it points at skills the company is lacking.

## Project layout

| File | Purpose |
|---|---|
| `index.html` | Page structure and windows |
| `style.css` | Layout and styling (scales with the window) |
| `game.js` | Game state, simulation, managers, and the menus |
| `hr.js` | HR advisor logic |
| `office.js` | The 2D office: drawing, movement, tap/click to move, interaction |

Saves live in the browser's local storage, so each browser and device has its own game.

## Deployment

Pushing to `main` publishes the game with GitLab Pages (see `.gitlab-ci.yml`). The job copies the game files into `public`. If you add a new file the game needs, add it to the `cp` line there.
