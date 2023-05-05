'use strict';

const Table = require('cli-table');

const c = require("../colors");
const mobsToCheck = ["Molten Giant", "Molten Destroyer", "Lava Surger", "Firelord", "Ebonroc", "Firemaw", "Flamegor", "Ragnaros"];

const firstHit = {};     // player -> mob -> time
const timeToSunder = {}; // player -> [seconds]
const playerNames = {};

const SunderArmorSpellId = 11597;

module.exports = {
   /**
    * Finds what spells triggers an aura.
    * @param log sender obj
    * @param options sent in CLI
    * @param lineNumber of processed event
    * @param event object
    * @param lastEvent object
    */
   processEvent: function (log, options, lineNumber, event, lastEvent) {
      if (['SPELL_CAST_SUCCESS', 'SPELL_MISSED', 'SWING_DAMAGE'].indexOf(event.event) !== -1 && event.source && event.target && event.source.guid.indexOf('Player-') === 0) { // mobsToCheck.indexOf(event.target.name) !== -1
         let playerFirstHit = firstHit[event.source.guid];
         if (!playerFirstHit) {
            playerFirstHit = {};
            firstHit[event.source.guid] = playerFirstHit;
            playerNames[event.source.guid] = event.source.name;
         }
         let time = playerFirstHit[event.target.guid];
         if (time === undefined) {
            time = +event.date;
            playerFirstHit[event.target.guid] = time;
         }
         if (time > 0 && ['SPELL_CAST_SUCCESS', 'SPELL_MISSED'].indexOf(event.event) !== -1 && event.spell.id === SunderArmorSpellId) {
            let playerTime = timeToSunder[event.source.guid];
            if (!playerTime) {
               playerTime = [];
               timeToSunder[event.source.guid] = playerTime;
            }
            playerTime.push(+event.date - time);
            playerFirstHit[event.target.guid] = 0; // clear time, so we won't count again for this player-mob
         }
      }
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
      report.avgTimeToSunder = {};

      var table = new Table({
         head: ['Sunders', 'Seconds', 'Player'],
      });

      let rows = [];
      for (let playerGuid in timeToSunder) {
         let playerTimeToSunder = timeToSunder[playerGuid];
         let avgTimeMs = playerTimeToSunder.reduce((prev, curr) => prev + curr, 0) / playerTimeToSunder.length;
         let playerName = playerNames[playerGuid];
         report.avgTimeToSunder[playerName] = Math.trunc(avgTimeMs) / 1000;
         rows.push([playerTimeToSunder.length, report.avgTimeToSunder[playerName], playerName]);
      }
      rows = rows.sort((a, b) => b[0] - a[0]);
      rows.forEach(row => table.push(row));
      console.log(table.toString());
   },
}
