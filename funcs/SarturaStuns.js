'use strict';

const Table = require('cli-table');

const c = require("../colors");
const StunSpells = {
   8643: "Kidney Shot", 
   1833: "Cheap Shot", 
   20617: "Intercept",
};
const StunAuras = {
   8643: "Kidney Shot", 
   1833: "Cheap Shot", 
   20615: "Intercept Stun",
};
const PlayerSpells = {1857: "Vanish"};

const firstHit = {};     // player -> mob -> time
const timeToSunder = {}; // player -> [seconds]
const playerNames = {};

let stunStart = 0;

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
      let result = {printPretty: false, stunDuration: 0};
      if (!currentEncounter || currentEncounter.encounterId !== 711)
         return result;

      if (event.target && event.target.name === currentEncounter.encounterName) {
         if (event.source.name === currentEncounter.encounterName && event.spell.id === 26083) {
            // whirlwind
            result.printPretty = true;
         }
         if (event.event === "SPELL_CAST_SUCCESS" && StunSpells[event.spell.id]) {
            result.printPretty = true;
         }
         if (event.event === "SPELL_MISSED" && StunSpells[event.spell.id])
            result.printPretty = true;
         if ("SPELL_AURA_APPLIED" === event.event && StunAuras[event.spell.id]) {
            result.printPretty = true;
            stunStart = +event.date;
         }
         if ("SPELL_AURA_REMOVED" === event.event && StunAuras[event.spell.id]) {
            result.printPretty = true;
            if (stunStart) {
               result.stunDuration = +event.date - stunStart;
               stunStart = 0;
            }
         }
      }
      if (event.event === "SPELL_CAST_SUCCESS" && event.source && event.source.guid.indexOf("Player-") == 0 && PlayerSpells[event.spell.id]) {
         result.printPretty = true;
      }
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
