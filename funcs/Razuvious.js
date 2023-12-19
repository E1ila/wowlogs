'use strict';

const Table = require('cli-table');

const c = require("../colors");
const PlayerSpells = {1857: "Vanish"};

let firstMC = undefined;
let understudyName = undefined;
let razuviousName = undefined;

const MIND_CONTROL = 10912;
const UNDERSTUDY_TAUNT = 29060;
const WARRIOR_TAUNT = 355;

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
      let result = {printPretty: false, finishNow: false};
      options['guid'] = true;

      if (!firstMC && event.event === 'SPELL_CAST_SUCCESS' && event.target && event.spell && event.spell.id === MIND_CONTROL) {
         const targetParts = event.target.guid.split('-');
         if (targetParts.length === 7 && targetParts[5] === '16803') {
            result.printPretty = true;
            firstMC = event;
            understudyName = event.target.name;
         }
      }

      if (event.event === 'ENCOUNTER_END')
         firstMC = undefined;

      if (event.event === 'UNIT_DIED' && event.target.name === razuviousName) {
         result.printPretty = true;
         result.finishNow = true;
      }
   
      if (!currentEncounter || currentEncounter.encounterId !== 1113)
         return result;

      if (!razuviousName)
         razuviousName = currentEncounter.encounterName;

      if (event.event === 'UNIT_DIED' && event.source.name === understudyName) {
         result.printPretty = true;
      }

      if (event.spell && [MIND_CONTROL, UNDERSTUDY_TAUNT, WARRIOR_TAUNT].indexOf(event.spell.id) != -1) {
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
