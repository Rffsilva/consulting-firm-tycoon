/**
 * Game balance. Change numbers here to tune the game; nothing else needs to change.
 */
(function (CFT) {
  'use strict';

  CFT.config = Object.freeze({
    SKILLS: ['Strategy', 'Analytics', 'Technology', 'Finance', 'Operations'],
    MAX_SKILL_LEVEL: 10,
    OWNER_SKILLS: { Strategy: 4, Analytics: 2, Technology: 1, Finance: 3, Operations: 3 },

    // Time
    MS_PER_DAY: 3000,          // real milliseconds per in-game day at 1x speed
    DAYS_PER_MONTH: 30,        // wages and rent are paid every this many days

    // Company
    STARTING_CASH: 15000,
    STARTING_DESKS: 3,
    MAX_DESKS: 20,
    DESKS_PER_EXPANSION: 2,
    DESK_COST: 6000,
    RENT_PER_DESK: 250,        // per desk per month
    BANKRUPTCY_LIMIT: -5000,   // game over when cash drops below this

    // Client requests and projects
    MAX_OFFERS: 5,
    OFFER_LIFETIME: 12,        // days an unaccepted request stays on the board
    OFFER_REFILL_DAYS: 3,      // the board is topped up every this many days
    EARLY_BONUS_PER_DAY: 0.01, // share of the reward per day delivered early...
    EARLY_BONUS_MAX: 0.2,      // ...up to this share
    LATE_FINE: 0.25,           // share of the reward paid as a fine on a missed deadline

    // Hiring
    CANDIDATE_REFRESH_DAYS: 10,
    CANDIDATE_REFRESH_COST: 300,

    // Training (cost = base + current level * per level; salary rises by the raise per level gained)
    TRAIN_BASE_COST: 400,
    TRAIN_COST_PER_LEVEL: 350,
    TRAIN_SALARY_RAISE: 60,
    MANAGEMENT_TRAIN_BASE_COST: 600,
    MANAGEMENT_TRAIN_COST_PER_LEVEL: 400,
    MANAGEMENT_SALARY_RAISE: 80,

    // Managers handle this many staff plus their Management level
    MANAGER_BASE_CAPACITY: 2,

    // HR compares hiring and training over this many months of salary
    HR_COST_HORIZON_MONTHS: 3,
    // Training someone who already has work pulls them off it, so HR weighs their cost this many times over an idle
    // person's (who has nothing else to do).
    HR_BUSY_TRAINEE_PENALTY: 1.5,

    LOG_LIMIT: 80,
    SAVE_KEY: 'cft-save-v1',
  });
})(window.CFT);
