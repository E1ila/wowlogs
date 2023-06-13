'use strict';

const Table = require('cli-table');
const c = require("../colors");

const hits = {};
const melee = {};

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
      let result = {printPretty: false};
      if (!currentEncounter || currentEncounter.encounterName != 'Nefarian')
         return result;
      if (event.event === "SWING_DAMAGE_LANDED" && event.source && event.source.guid.indexOf('Player-') == 0) 
         melee[event.source.name] = (melee[event.source.name] || 0) + event.amount;
      if (event.target && event.target.name && event.target.name.indexOf('Corrupted ') == 0 && event.target.name.indexOf('Totem') != -1) {
         if (event.event === "SWING_DAMAGE") {
            hits[event.source.name] = (hits[event.source.name] || 0) + 1;
            result.printPretty = true;
         }
         if (event.event === "SWING_DAMAGE_LANDED" && event.target && event.target.name.indexOf('Corrupted ') == 0)
            result.printPretty = true;
      }
      return result;
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
      var table = new Table({
         head: ['Player', 'Hits'],
      });

      let rows = [];
      for (let name in melee) {
         if (melee[name] > 5000)
            rows.push([name, hits[name] || 0]);
      }
      rows = rows.sort((a, b) => b[1] - a[1]);
      rows.forEach(row => table.push(row));
      console.log(table.toString());
   },
}
