/**
 * The employee role registry, plus helpers shared by every kind of employee.
 *
 * Each kind of employee lives in its own file in this folder (owner.js, consultant.js, manager.js, hr.js)
 * and registers a Role. The rest of the game asks the role what to do instead of checking types, so a new
 * kind of employee only needs a new file (see docs/ARCHITECTURE.md, "Adding an employee type").
 *
 * @typedef {Object} Look            How a person is drawn in the office (see office/sprites.js).
 * @property {number} id             Seeds blinking so people don't blink in sync.
 * @property {string} shirt
 * @property {string} hair
 * @property {string} skin
 * @property {number} style          Hair style 0-3: side fringe, long, tuft, cap.
 * @property {boolean} [glasses]
 * @property {string|null} [tie]     Tie colour.
 *
 * @typedef {Object} Role
 * @property {string} id
 * @property {boolean} worksOnProjects     Can be put on projects and produce points.
 * @property {boolean} managedByManagers   Managers may assign this person automatically.
 * @property {boolean} [drawnAtDesk=true]  False for the owner, who is the walking player instead.
 * @property {string[]} [extraSkills]      Trainable skills on top of config.SKILLS (e.g. 'Management').
 * @property {(s: State) => Employee} [createCandidate]   Makes a new candidate for the job market.
 * @property {(e: Employee) => {label: string, hint: string}[]} [badges]   Extra tags on the person's cards.
 * @property {(e: Employee, s: State) => string} [cardStatus]  Shown on the card instead of the project picker.
 * @property {(e: Employee) => Look} look
 * @property {(e: Employee, s: State) => boolean} [isBusy]   Typing animation at the desk.
 * @property {(e: Employee, s: State) => ({text: string, color: string, bob?: boolean}|null)} [deskBubble]
 * @property {string} [deskWindow]                  Window opened from the desk instead of the employee card.
 * @property {(e: Employee) => string} [deskLabel]  Prompt text near the desk.
 * @property {(s: State) => void} [onDayStart]      Runs at the start of every day if anyone has this role.
 */
(function (CFT) {
  'use strict';
  const { config, content, palette, util } = CFT;
  const { pick, hash } = util;

  /** @type {Object<string, Role>} */
  const roles = {};

  function registerRole(role) {
    roles[role.id] = role;
  }

  /**
   * The role of an employee or candidate. Saved games mark the owner with `owner: true` and special staff with
   * `role`; consultants have neither.
   * @returns {Role}
   */
  const roleOf = e => roles[e.owner ? 'owner' : e.role || 'consultant'];
  const is = (e, roleId) => roleOf(e).id === roleId;

  // ---------- Creating people ----------

  function emptySkills() {
    const skills = {};
    for (const s of config.SKILLS) skills[s] = 0;
    return skills;
  }

  const randomName = () => `${pick(content.FIRST_NAMES)} ${pick(content.LAST_NAMES)}`;

  /** The best skill level showing up on the job market. Grows with reputation. */
  const marketSkillCap = s => Math.min(config.MAX_SKILL_LEVEL, 5 + Math.floor(s.rep / 12));

  const roundSalary = n => Math.round(n / 10) * 10;

  /** Stable pseudo-random bits from the person's id, so they look the same every time. */
  const lookSeed = e => hash(e.id);

  /** Hair and skin picked from the person's id. Roles add the rest (shirt, style, accessories). */
  function baseLook(e) {
    const h = lookSeed(e);
    return { id: e.id, hair: palette.HAIR[h % palette.HAIR.length], skin: palette.SKIN[(h >> 4) % palette.SKIN.length] };
  }

  // ---------- Skills and training ----------

  const MANAGEMENT = 'Management';

  const skillLevel = (e, skill) => (skill === MANAGEMENT ? e.mgmt : e.skills[skill]);

  const trainCost = (e, skill) => (skill === MANAGEMENT
    ? config.MANAGEMENT_TRAIN_BASE_COST + e.mgmt * config.MANAGEMENT_TRAIN_COST_PER_LEVEL
    : config.TRAIN_BASE_COST + e.skills[skill] * config.TRAIN_COST_PER_LEVEL);

  /** Total cost of training `skill` up by `steps` levels, one session at a time. */
  function trainPlanCost(e, skill, steps) {
    let cost = 0;
    for (let i = 0; i < steps; i++) cost += config.TRAIN_BASE_COST + (e.skills[skill] + i) * config.TRAIN_COST_PER_LEVEL;
    return cost;
  }

  const salaryRaise = skill => (skill === MANAGEMENT ? config.MANAGEMENT_SALARY_RAISE : config.TRAIN_SALARY_RAISE);

  const trainableSkills = e => (roleOf(e).extraSkills || []).concat(config.SKILLS);

  /** People who do project work: the owner and consultants. */
  const projectWorkers = s => s.employees.filter(e => roleOf(e).worksOnProjects);

  CFT.staff = {
    roles, registerRole, roleOf, is,
    emptySkills, randomName, marketSkillCap, roundSalary, lookSeed, baseLook,
    MANAGEMENT, skillLevel, trainCost, trainPlanCost, salaryRaise, trainableSkills,
    projectWorkers,
  };
})(window.CFT);
