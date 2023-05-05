'use strict';

const Table = require('cli-table');
const c = require("../colors");

const totalDamage = {};
const rogues = {};
const disarms = {};
let supressionRoom = 0;

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
      let result = { printPretty: false };
      if (["SWING_MISSED", "SWING_DAMAGE_LANDED"].indexOf(event.event) !== -1) {
         if (event.isOffhand)
            result.processEvent = true;
      }
      return result;
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
      // var table = new Table({
      //    head: ['Player', 'Supression Room Dmg', 'Traps Disarmed'],
      // });

      // let rows = [];
      // for (let name in rogues) {
      //    rows.push([name, totalDamage[name] || 0, disarms[name] || 0]);
      // }
      // rows = rows.sort((a, b) => b[2] - a[2]);
      // rows.forEach(row => table.push(row));
      // console.log(table.toString());
   },
}
