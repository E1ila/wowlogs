'use strict';

const Table = require('cli-table');
const c = require("../colors");

const MAX_DIFF = 50;

let playerProcs = {};
let minTime = Infinity;
let procs = 0;

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
      if (event.event === "SPELL_EXTRA_ATTACKS" && event.spell && event.spell.name === "Windfury Totem") {
         // result.printPretty = true;
         let previous = playerProcs[event.source.name];
         if (previous && previous.length) {
            let diff;
            do {
               diff = +event.date - previous[0];
               if (diff > MAX_DIFF) {
                  previous.shift();
               }
            } while (previous.length && diff > MAX_DIFF);

            if (previous.length && diff <= MAX_DIFF) {
               // if (diff < 20)
               //    console.log(`Suspicious time diff ${diff} found at line ${lineNumber} by ${event.source.name}`);
               if (diff < minTime) {
                  minTime = diff;
                  console.log(`NEW RECORD! Diff ${diff} found at line ${lineNumber} by ${event.source.name}`);
               }
            }
         } else {
            previous = [];
            playerProcs[event.source.name] = previous;
         }
         previous.push(+event.date);
         procs++;
         if (previous.length > 1) 
            console.log(`FOUND ${previous.length} WF PROCS! -- ${previous.map((t, index, arr) => index > 0 ? t - arr[index-1] : t)} -- Line ${lineNumber} by ${event.source.name}`);
      }
      return result;
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
      // console.log(`File minimum time: ${minTime} ms, procs: ${procs}`);
      playerProcs = {};
      procs = 0;
   },

   finishReport: function (report, options) {
      console.log(`Overall minimum time found: ${minTime} ms`);
   },
}
