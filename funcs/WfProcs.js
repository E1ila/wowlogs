'use strict';

const Table = require('cli-table');
const c = require("../colors");

const playerProcs = {};

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
      if (event.event === "SPELL_EXTRA_ATTACKS") {
         result.printPretty = true;
         playerProcs[event.source.name] = (playerProcs[event.source.name] || 0) + 1;
      }
      return result;
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
      var table = new Table({
         head: ['Player', 'WF Procs'],
      });

      let rows = [];
      for (let name in playerProcs) {
         let row = [name, playerProcs[name]];
         rows.push(row);
      }
      rows = rows.sort((a, b) => b[1] - a[1]);
      rows.forEach(row => table.push(row));
      console.log(table.toString());
   },
}
