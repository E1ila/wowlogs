'use strict';

const Table = require('cli-table');

const c = require("../colors");
const PrintSpells = {
   19801: "Tranquilizing Shot", 
};
const FrenzySpells = {
   23128: "Frenzy", // chromaggus
   26051: "Frenzy", // huhuran
};

let frenzyStart = 0;

module.exports = {
   /**
    * Finds what spells triggers an aura.
    * @param log sender obj
    * @param options sent in CLI
    * @param lineNumber of processed event
    * @param event object
    * @param lastEvent object
    */
   processEvent: function (log, options, lineNumber, event, lastEvent, currentEncounter) {
      let result = {printPretty: false, frenzyDuration: 0};
      if (!currentEncounter)
         return result;

      if (event.event === "UNIT_DIED" && event.target && event.target.guid.indexOf("Player-") == 0) 
         result.printPretty = true;

      if (event.target && event.target.name === currentEncounter.encounterName) {
         if (event.spell && PrintSpells[event.spell.id])
            result.printPretty = true;
         if ("SPELL_AURA_APPLIED" === event.event && FrenzySpells[event.spell.id]) {
            result.printPretty = true;
            frenzyStart = +event.date;
         }
         if ("SPELL_AURA_REMOVED" === event.event && FrenzySpells[event.spell.id]) {
            result.printPretty = true;
            if (frenzyStart) {
               result.frenzyDuration = +event.date - frenzyStart;
               frenzyStart = 0;
            }
         }
      }
      if (event.event === "SPELL_DISPEL")
         result.printPretty = false;
      return result;
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
      // var table = new Table({
      //    head: ['Sunders', 'Seconds', 'Player'],
      // });

      // let rows = [];
      // for (let playerGuid in timeToSunder) {
      //    let playerTimeToSunder = timeToSunder[playerGuid];
      //    let avgTimeMs = playerTimeToSunder.reduce((prev, curr) => prev + curr, 0) / playerTimeToSunder.length;
      //    let playerName = playerNames[playerGuid];
      //    report.avgTimeToSunder[playerName] = Math.trunc(avgTimeMs) / 1000;
      //    rows.push([playerTimeToSunder.length, report.avgTimeToSunder[playerName], playerName]);
      // }
      // rows = rows.sort((a, b) => b[0] - a[0]);
      // rows.forEach(row => table.push(row));
      // console.log(table.toString());
   },
}
