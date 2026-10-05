/**
 * Flavour text used to generate people and client requests.
 */
(function (CFT) {
  'use strict';

  CFT.content = Object.freeze({
    FIRST_NAMES: ['Alex', 'Sam', 'Priya', 'Jon', 'Mei', 'Carlos', 'Fatima', 'Liam', 'Aiko', 'Noah', 'Sofia', 'Omar', 'Greta', 'Raj', 'Elena', 'Tom'],
    LAST_NAMES: ['Smith', 'Patel', 'Garcia', 'Chen', 'Novak', 'Silva', 'Khan', 'Rossi', 'Müller', 'Okafor', 'Kim', 'Dubois', 'Ivanov', 'Miletić'],
    CLIENTS: ['Acme Corp', 'Globex', 'Initech', 'Umbrella Ltd', 'Hooli', 'Stark Retail', 'Wayne Logistics', 'Soylent Foods',
      'Vandelay Imports', 'Pied Piper', 'Cyberdyne', 'Wonka Industries'],
    // Project titles, by the first skill a request needs
    TASKS: {
      Strategy: ['Market entry plan', 'Growth strategy', 'Merger due diligence'],
      Analytics: ['Customer churn study', 'Sales forecasting', 'Pricing analysis'],
      Technology: ['Cloud migration', 'ERP rollout', 'Cybersecurity audit'],
      Finance: ['Cost reduction review', 'Budget restructuring', 'Investor deck'],
      Operations: ['Supply chain redesign', 'Process optimisation', 'Warehouse audit'],
    },
  });
})(window.CFT);
