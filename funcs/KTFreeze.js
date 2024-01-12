'use strict';

const Table = require('cli-table');
const c = require("../colors");

const frozen = {};
const FrostBlastSpellId = 27808;
const NatureSwiftness = [16188, 17116];
const SpellsToPrint = NatureSwiftness.concat([FrostBlastSpellId]);
let started = 0;

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

      if (currentEncounter && currentEncounter.encounterId === 1114) {
         if (!started && ['SPELL_CAST_SUCCESS', 'SPELL_AURA_APPLIED', 'SPELL_CAST_START', 'SWING_DAMAGE_LANDED'].indexOf(event.event) != -1 && (event.source && event.source.name === currentEncounter.encounterName || event.target && event.target.name === currentEncounter.encounterName)) {
            started = +event.date;
            result.printPretty = true;
         }
         if (event.event === 'ENCOUNTER_END')
            started = 0;
      }

      if (event.spell && SpellsToPrint.indexOf(event.spell.id) != -1) {
         result.printPretty = true;
      }
      if (event.event === "SPELL_AURA_APPLIED" && event.spell && event.spell.id === FrostBlastSpellId && event.target.guid.indexOf('Player-') === 0) {
         frozen[event.target.name] = true;
      }
      if (event.event === "SPELL_AURA_REMOVED" && event.spell && event.spell.id === FrostBlastSpellId && event.target.guid.indexOf('Player-') === 0) {
         frozen[event.target.name] = false;
      }
      if (event.target && frozen[event.target.name] && ["SPELL_AURA_REMOVED"].indexOf(event.event) == -1) {
         result.printPretty = true;
      }
      if (event.event === "UNIT_DIED" && event.target && frozen[event.target.name] != undefined)
         result.printPretty = true;
      return result;
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
   },
}
