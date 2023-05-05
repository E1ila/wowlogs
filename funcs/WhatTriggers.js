'use strict';

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
      if (!log.report.triggerCount)
         log.report.triggerCount = {}
      if (['SPELL_AURA_APPLIED', 'SPELL_AURA_REFRESH'].indexOf(event.event) !== -1 && options['params'][0] === event.spell.name && lastEvent) {
         const lastSpellName = lastEvent.spell.name;
         log.report.triggerCount[lastSpellName] = (log.report.triggerCount[lastSpellName] || 0) + 1;
      }
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
      // all files finished, print result
      console.log(`Spell,Triggers`);
      for (let spellName of Object.keys(report.triggerCount))
         console.log(spellName + ',' + report.triggerCount[spellName]);
   },
}
