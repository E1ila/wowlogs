'use strict';

const Table = require('cli-table');

const c = require("../colors");
const PlayerSpells = {1857: "Vanish"};

let firstMC = undefined;
let understudyName = undefined;
let razuviousName = undefined;
let lastRazTarget = undefined;

let mc = {};

const MIND_CONTROL = 10912;
const UNDERSTUDY_TAUNT = 29060;
const WARRIOR_TAUNT = 355;
const DISRUPTING_SHOUT = 29107;

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
      let result = {printPretty: false, finishNow: false};
      options['guid'] = true;
      const slim = options['params'].indexOf('slim') != -1;

      if (!firstMC && event.event === 'SPELL_CAST_SUCCESS' && event.target && event.spell && event.spell.id === MIND_CONTROL) {
         const targetParts = event.target.guid.split('-');
         if (targetParts.length === 7 && targetParts[5] === '16803') {
            result.printPretty = true;
            mc[event.target.guid] = {by: event.source.name, time: +event.date};
            firstMC = event;
            understudyName = event.target.name;
         }
      }

      if (event.event === 'ENCOUNTER_END') {
         firstMC = undefined;
         mc = {};
         result.printPretty = true;
      }

      if (event.event === 'ENCOUNTER_START' && event.encounterId === 1113) {
         result.printPretty = true;
      }

      if (event.event === 'UNIT_DIED' && event.target.name === razuviousName) {
         result.printPretty = true;
         result.finishNow = true;
      }
   
      if (!currentEncounter || currentEncounter.encounterId !== 1113)
         return result;

      let trackedTaunts = slim ? [UNDERSTUDY_TAUNT] : [WARRIOR_TAUNT, UNDERSTUDY_TAUNT];

      if (!razuviousName)
         razuviousName = currentEncounter.encounterName;

      if (event.event === 'UNIT_DIED' && !slim) {
         result.printPretty = true;
      }

      if (event.spell && event.spell.id === MIND_CONTROL && event.target.name != event.source.name && ['SPELL_MISSED', 'SPELL_AURA_REMOVED', 'SPELL_AURA_APPLIED'].indexOf(event.event) != -1) {
         result.printPretty = true;
         const mcdata = mc[event.target.guid];
         if (event.event === 'SPELL_AURA_APPLIED') {
            if (mcdata) 
               result.extraText = `${c.greenDark}last MC ${c.green}${(+event.date-mcdata.time)/1000}${c.greenDark} sec ago by ${c.green}${mcdata.by}${c.off}`;
            mc[event.target.guid] = {by: event.source.name, time: +event.date};
         } else if (event.event === 'SPELL_AURA_REMOVED') {
            result.extraText = `${c.cyan}MC lasted ${(+event.date-mcdata.time)/1000} sec${c.off}`;
            mcdata.time = +event.date;
         } else if (event.event === 'SPELL_MISSED' && event.missType === 'IMMUNE' && mc[event.target.guid]) {
            result.extraText = `${c.greenDark}last MC ${c.green}${(+event.date-mcdata.time)/1000}${c.greenDark} sec ago by ${c.green}${mcdata.by}${c.off}`;
         }
      }

      if (event.target && mc[event.target.guid]) 
         event.target.mcBy = mc[event.target.guid].by;

      if (event.source && mc[event.source.guid]) 
         event.source.mcBy = mc[event.source.guid].by;

      if (event.spell && trackedTaunts.indexOf(event.spell.id) != -1 && ['SPELL_MISSED', 'SPELL_AURA_REMOVED', 'SPELL_AURA_APPLIED'].indexOf(event.event) != -1) { 
         if (event.spell.id != WARRIOR_TAUNT || event.event != 'SPELL_AURA_REMOVED')
            result.printPretty = true;
      }

      if (event.spell && event.spell.id === DISRUPTING_SHOUT && !slim) {
         result.printPretty = true;
      }
      else if (event.source && event.target && event.target.name && event.source.name === razuviousName && event.target.name != lastRazTarget && !slim) {
         lastRazTarget = event.target.name;
         result.printPretty = true;
         console.log(` -- ${c.orangeBright}${razuviousName} attacks ${event.target.name}${c.off}`);
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
