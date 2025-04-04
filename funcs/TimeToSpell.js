'use strict';

const Table = require('cli-table');

const c = require("../colors");

const engageTime = {};     // player -> mob -> time

let stunStart = 0;

module.exports = {
   /**
    * PARAM1 = creature name
    * PARAM2 = spell name
    *
    * @param log sender obj
    * @param options sent in CLI
    * @param lineNumber of processed event
    * @param event object
    * @param lastEvent object
    */
   processEvent: function (log, options, lineNumber, event) {
      let result = {printPretty: false, printRaw: false};

      if (!options.params || !options.params.length) {
         throw new Error("No params provided - [creature name] [spell name]");
      }
      const creatureName = options.params[0];
      const spellName = options.params[1];

      // record engagement
      if (event.source && event.source.guid && event.source.name === creatureName && !engageTime[event.source.guid]) {
         console.log(`--------- Engaged ${event.source.name}`);
         engageTime[event.source.guid] = +event.date;
      }
      if (event.target && event.target.guid && event.target.name === creatureName && !engageTime[event.target.guid]) {
         console.log(`--------- Engaged ${event.source.name}`);
         engageTime[event.target.guid] = +event.date;
      }

      // check spell
      if (
         event.source && event.source.guid &&
         event.event === "SPELL_CAST_SUCCESS" &&
         event.spell.name === spellName &&
         event.source.name === creatureName
      ) {
         result.printPretty = true;
         result.extraText = `${c.cyan}time: ${(+event.date-engageTime[event.source.guid])/1000} sec${c.off}`;
         engageTime[event.source.guid] = +event.date;
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
