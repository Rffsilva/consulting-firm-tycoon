# Architecture

A guide for working on the code. For how to play, see the [README](../README.md).

## Principles

- **No build, no dependencies.** Plain HTML, CSS and JavaScript. `index.html` works when opened straight from disk, and the same files are what GitLab Pages serves.
- **One global.** Every script is wrapped in a function and registers what it provides on `window.CFT`. Nothing else is global.
- **Load order is dependency order.** Scripts are classic `<script>` tags (ES modules would stop the game working when opened from disk). A file may use anything registered by files listed above it in `index.html`. The few places that need something loaded later look it up when called, and are marked `(… loads later)`.
- **Game rules don't touch the page.** `js/core`, `js/sim` and `js/employees` only read and change the state. They never call `alert`, build HTML or read the DOM, which is what makes them testable (see [Tests](#tests)).
- **The state is plain JSON.** Everything about a running game is in one object (`CFT.store.state`), saved to `localStorage` after every day. Keep it that way: no functions or class instances in it. Its shape is documented at the top of `js/core/store.js`.

## Folders

```
index.html            page structure, windows, and the script load order
css/
  base.css            colours, type, buttons, cards, tags, progress bars
  layout.css          header, office area, side panel, log, phone layouts
  windows.css         pop-up windows and window-specific styles
js/
  namespace.js        creates window.CFT
  core/               shared foundations
    config.js         every balance number (costs, speeds, limits)
    content.js        names, client names, project titles
    palette.js        colours used by the office and by role looks
    util.js           rnd, pick, sum, money, esc, hash
    store.js          the state's shape, the running game, log, save/load
  sim/                game rules
    projects.js       client requests, accepting, progress estimates, delivery and failure
    company.js        player actions: hire, fire, train, assign, expand, refresh candidates
    simulation.js     new game, and one simulated day
  employees/          one file per kind of employee
    staff.js          the role registry and helpers shared by all employees
    owner.js          you
    consultant.js     the people who do project work
    manager.js        auto-assign staff; company strategies
    hr.js             hire/train advice
  ui/                 HTML windows and side panel
    components.js     shared card and button builders
    clock.js          the game clock and speed buttons
    windows.js        opening/closing windows (pauses the game)
    panels/*.js       one renderer per window or panel
    render.js         redraws every panel
    actions.js        handles every button and dropdown (data-action)
    session.js        new game, resume, game over
  office/             the 2D office canvas
    map.js            floor plan, desks, stations, collision
    painter.js        canvas and drawing primitives, scaling
    sprites.js        drawing people
    scene.js          drawing the office
    player.js         the player's movement and click/tap pathfinding
    interaction.js    what can be used, the prompt, clicks, E key
    loop.js           the animation loop
  main.js             wires everything together and starts the game
tests/                in-browser tests for the game rules
docs/                 this file
```

## How a day works

`CFT.ui.clock` calls `CFT.simulation.advanceDay(state)` every `config.MS_PER_DAY / speed` milliseconds. In order:

1. **Role behaviour.** Each role's `onDayStart` runs once if anyone has that role. Managers use it to assign idle staff (`management.autoAssign`).
2. **Work.** Everyone on a project who `worksOnProjects` adds points equal to their level to the open requirement they are best at (`projects.taskFor`).
3. **Settle.** Finished projects pay out (plus an early bonus). Projects past their deadline are failed with a fine (`projects.settle`).
4. **Month end.** Wages and rent are paid every `DAYS_PER_MONTH` days.
5. **Market.** Expired requests leave the board, new requests and candidates appear.

The clock then saves the game and redraws the panels. The office canvas redraws itself every animation frame from the same state.

Progress estimates (`projects.eta`) use the same rule as step 2, so the "On track / At risk" labels, the managers and HR all agree with what actually happens.

## Employees and roles

Every person is a plain object in `state.employees` (or `state.candidates`). What kind of employee they are is stored in the save as `owner: true` or `role: 'manager' | 'hr'`. Consultants have neither. `staff.roleOf(e)` maps that to a **role**: an object, registered by a file in `js/employees/`, that tells the rest of the game how this kind of person behaves. Behaviour that differs between kinds of employees belongs in the role. Outside `js/employees/`, code only checks types for a few specific things: the owner's own card and desk, listing managers in the strategy window, and which candidates appear on the job market.

The full `Role` interface is documented at the top of `js/employees/staff.js`. The main fields:

| Field | Meaning |
|---|---|
| `worksOnProjects` | Can be assigned and produces points |
| `managedByManagers` | Managers may place this person automatically |
| `createCandidate(state)` | Makes a candidate for the job market |
| `look(e)` | How the person is drawn (shirt, hair, glasses...) |
| `isBusy`, `deskBubble` | Typing animation and the bubble over their desk |
| `badges`, `cardStatus` | Extra tags and status line on their cards |
| `deskWindow`, `deskLabel` | What opens when you use their desk |
| `extraSkills` | Trainable skills beyond the five project skills |
| `onDayStart(state)` | Daily behaviour |

### Adding an employee type

For example, a "Salesperson" who brings in extra client requests:

1. Create `js/employees/salesperson.js`. Copy `hr.js` as a starting point, and call `staff.registerRole({ id: 'sales', ... })` with at least `worksOnProjects`, `managedByManagers`, `createCandidate` (set `role: 'sales'` on the person it returns) and `look`.
2. Put its behaviour in `onDayStart(state)`, for example adding an extra offer with `projects.makeOffer(state)`.
3. Add the script to `index.html` and `tests/index.html`, after `hr.js`.
4. Put them on the job market in `company.refillCandidates`.
5. If they need their own window, see the next section.
6. Add tests to `tests/employees.test.js`.

## Windows and buttons

- Each window is a `<section data-panel="name">` in `index.html`. It is filled by `js/ui/panels/<name>.js`, which registers `CFT.ui.panels.<name> = state => { ... }`, and is listed in `js/ui/render.js`.
- Open a window with `CFT.ui.windows.open('name')`, from a header button (`data-open="name"`) or from an office station (`STATIONS` in `js/office/map.js`).
- Buttons don't use `onclick`. They declare `data-action="hire" data-id="12"`, and `js/ui/actions.js` looks the action up in one table. To add a button, give it a `data-action` and add a handler there. Handlers change the state through `CFT.company` (or another rules module), and the screen is redrawn afterwards.
- Rules functions return `{ ok: false, error }` when an action can't be done. The UI shows the error.

## The office

The office is a 480 x 320 canvas (30 x 20 tiles of 16 px), scaled up by CSS with crisp pixels and redrawn every frame. Positions of people are their **feet**, in canvas pixels. Everything is drawn with filled rectangles (`painter.rect`) and outlined boxes (`painter.box`). There are no image files.

- To move furniture or stations, edit `js/office/map.js` (blocked tiles, `STATIONS`), and their drawing in `js/office/scene.js`.
- To change how a kind of person looks, edit its role's `look()`. `sprites.drawPerson` draws any look.

## Tests

Open `tests/index.html` in a browser. It loads the game-rules scripts (core, sim, employees), never the UI, and runs every test in `tests/*.test.js` with a tiny runner (`tests/runner.js`). `tests/fixtures.js` builds small, predictable states (`fx.state()`, `fx.person()`, `fx.project()`...), because a real new game is random.

When you change a rule, add or update a test next to the related ones.

## Saves

Saves use the `localStorage` key in `config.SAVE_KEY`. If you change the shape of the state in a way old saves can't handle, either keep old saves working (for example with `||` defaults where the field is read, as `management.strategyOf` does) or change `SAVE_KEY` so old saves are ignored.

## Deployment

`.gitlab-ci.yml` copies `index.html`, `css/` and `js/` into `public/` on every push to `main`, and GitLab Pages serves it.
