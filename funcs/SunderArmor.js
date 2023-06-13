'use strict';

const Table = require('cli-table');

const c = require("../colors");
const mobsToCheck = ["Molten Giant", "Molten Destroyer", "Lava Surger", "Firelord", "Ebonroc", "Firemaw", "Flamegor", "Ragnaros"];

const firstHit = {};     // player -> mob -> time
const timeToSunder = {}; // player -> [seconds]
const warriorNames = {};
const SunderArmorSpellId = 11597;
const HeroicStrikeSpellId = 25286;

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
      if (event.source && event.target && event.source.guid.indexOf('Player-') === 0 && ['SPELL_CAST_SUCCESS', 'SPELL_MISSED'].indexOf(event.event) !== -1 && event.spell.id === HeroicStrikeSpellId) 
         warriorNames[event.source.guid] = event.source.name;

      if (['SPELL_CAST_SUCCESS', 'SPELL_MISSED', 'SWING_DAMAGE'].indexOf(event.event) !== -1 && event.source && event.target && event.target.name && event.source.guid.indexOf('Player-') === 0) { // mobsToCheck.indexOf(event.target.name) !== -1
         let playerFirstHit = firstHit[event.source.name];
         if (!playerFirstHit) {
            playerFirstHit = {};
            firstHit[event.source.name] = playerFirstHit;
         }
         let time = playerFirstHit[event.target.guid];
         if (time === undefined) {
            time = +event.date;
            playerFirstHit[event.target.guid] = time;
         }
         if (time > 0 && ['SPELL_CAST_SUCCESS', 'SPELL_MISSED'].indexOf(event.event) !== -1 && event.spell.id === SunderArmorSpellId) {
            let playerTime = timeToSunder[event.source.name];
            if (!playerTime) {
               playerTime = [];
               timeToSunder[event.source.name] = playerTime;
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
      for (let warriorName of Object.values(warriorNames)) {
         let playerTimeToSunder = timeToSunder[warriorName] || [];
         playerTimeToSunder = playerTimeToSunder.sort((a, b) => a - b);
         let medianTime = 0;
         if (playerTimeToSunder.length == 1)
            medianTime = playerTimeToSunder[0];
         else if (playerTimeToSunder.length > 1)
            medianTime = playerTimeToSunder[Math.trunc(playerTimeToSunder.length / 2)];
         report.avgTimeToSunder[warriorName] = Math.trunc(medianTime) / 1000;
         rows.push([playerTimeToSunder.length || 0, playerTimeToSunder.length ? report.avgTimeToSunder[warriorName] : '--', warriorName]);
      }
      rows = rows.sort((a, b) => b[0] - a[0]);
      rows.forEach(row => table.push(row));
      console.log(table.toString());
   },
}
