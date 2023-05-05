'use strict';

const c = require("../colors");

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
      if (['SPELL_CAST_SUCCESS', 'SPELL_MISSED'].indexOf(event.event) !== -1 && options['params'][0] === event.spell.name && lastEvent) {
         console.log(`${c.grayDark}${event.dateStr} ${c.cyanDark}${event.event} ${c.cyan}${event.spell.name} ${c.grayDark}by ${c.gray}${event.source.name} ${c.grayDark}on ${c.gray}${event.target.name} ${c.orangeDark}${event.eventSuffix} ${c.orange}${event.missType || ''}${c.off}`);
      }
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
   },
}
