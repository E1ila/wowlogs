'use strict';

const Table = require('cli-table');

const c = require("../colors");

let dmghealStack = [];

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
      if (options.params.length < 1) {
         throw new Error(`${c.red}Missing player name${c.off}`);
      }
      const player = options.params[0];
      let sourceMatch = (event.source && event.source.name === player);
      let targetMatch = (event.target && event.target.name === player);
      let unitDied = event.event === 'UNIT_DIED' && (sourceMatch || targetMatch)
      if (event.event !== 'COMBATANT_INFO' && !unitDied && !targetMatch)
         return;
      if (!unitDied && !(event.amount > 0 && event.event !== 'SPELL_ENERGIZE'))
         return;
      const timeBeforeDeath = options.params.length > 1 ? +options.params[1] : 10000;
      while (dmghealStack.length && (dmghealStack.length > 100 || dmghealStack[0][0] < +event.date - timeBeforeDeath)) {
         dmghealStack.shift();
      }
      if (unitDied) {
         for (let i = dmghealStack.length - 1; i >= 0; i--) {
            const item = dmghealStack[i];
            if (item[2] > 0) {
               dmghealStack = dmghealStack.slice(i);
               break;
            }
            if (item[3]) {
               const d = +event.date - item[0];
               item[1] += `   ${c.cyan}${d/1000} sec before death${c.off}`;
            }
         }
         console.log(`--------------------------------------------------------------------------------`);
         console.log(dmghealStack.map(i => i[1]).join('\n'));
         dmghealStack = [];
         return { printPretty: true };
      }
      return { printToStack: dmghealStack, printPretty: true };
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
      // var table = new Table({
      //    head: ['Sunders', 'Seconds', 'Player'],
      // });
      // let rows = [];
      // rows = rows.sort((a, b) => b[0] - a[0]);
      // rows.forEach(row => table.push(row));
      // console.log(table.toString());
   },
}
