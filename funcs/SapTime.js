'use strict';

const c = require("../colors");
const moment = require('moment');

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
      if (!log.sapStart) {
         log.sapStart = {};
         log.sapEnd = {};
      }
      if (event.event === 'SPELL_AURA_APPLIED' && event.spell.name === options.params[0]) {
         const now = +moment(event.date);
         const lastEnd = log.sapEnd[event.source.name];
         let timeSinceLastEnd = 0;
         if (lastEvent)
            timeSinceLastEnd = now - lastEnd;
         log.sapStart[event.source.name] = now;
         console.log(`${c.grayDark}${event.dateStr} Sap ${c.grayDark}by ${c.gray}${event.source.name} ${c.grayDark}on ${c.gray}${event.target.name} ${c.green}applied${timeSinceLastEnd ? ` ${c.grayDark}last sap ${c.purpleBright}${timeSinceLastEnd/1000} ${c.grayDark} sec ago` : ''}${c.off}`);
      }
      else if (event.event === 'SPELL_AURA_REMOVED' && event.spell.name === options.params[0]) {
         const now = +moment(event.date);
         log.sapEnd[event.source.name] = now;
         const start = log.sapStart[event.source.name];
         if (start) {
            const ms = now - start;
            console.log(`${c.grayDark}${event.dateStr} Sap ${c.grayDark}by ${c.gray}${event.source.name} ${c.grayDark}on ${c.gray}${event.target.name} ${c.gray}ended ${c.grayDark}took ${c.orangeBright}${ms/1000}${c.grayDark} seconds${c.off}`);
         }
      }
      else if (event.event === 'SPELL_MISSED' && event.spell.name === options.params[0]) {
         const now = +moment(event.date);
         const lastEnd = log.sapEnd[event.source.name];
         let timeSinceLastEnd = 0;
         if (lastEvent)
            timeSinceLastEnd = now - lastEnd;
         console.log(`${c.grayDark}${event.dateStr} Sap ${c.grayDark}by ${c.gray}${event.source.name} ${c.grayDark}on ${c.gray}${event.target.name} ${c.red}${event.missType}${timeSinceLastEnd ? ` ${c.grayDark}last sap ${c.purpleBright}${timeSinceLastEnd/1000} ${c.grayDark} sec ago` : ''}${c.off}`);
      }
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
   },
}
