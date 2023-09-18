'use strict';

const Table = require('cli-table');

const c = require("../colors");

let encounterStart = 0;
const players = {};
const warriors = {};
const BattleShoutSpellId = {
   25289: 7,
   11551: 6,
   11550: 5,
   11549: 4,
   6192: 3,
   5242: 2,
   6673: 1,
}

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
      if (options['encounter'] && !encounterStart && currentEncounter) {
         encounterStart = +event.date;
      }
      const InitPlayer = (name) => {
         if (!players[name])
            players[name] = {start: 0, uptime: 0, usedEncounterStart: false};
      };
      const AddUptime = (name) => {
         if (!players[name].start) {
            if (encounterStart && !players[name].usedEncounterStart) {
               players[name].start = encounterStart;
               players[name].usedEncounterStart = true;
            } else 
               // console.log(`ERROR: Missing battle shout start time! [line ${lineNumber}]`);
               return;
         }
         const uptime = +event.date - players[name].start;
         players[name].uptime = players[name].uptime + uptime;
         players[name].start = 0;
      }
      if (event.spell && BattleShoutSpellId[event.spell.id]) {
         if (event.event === "SPELL_CAST_SUCCESS") {
            const rank = BattleShoutSpellId[event.spell.id];
            if (!warriors[event.source.name]) 
               warriors[event.source.name] = {};
            warriors[event.source.name][rank] = (warriors[event.source.name][rank] || 0) + 1;
         } 
         if (event.event === "SPELL_AURA_APPLIED") {
            InitPlayer(event.target.name);
            if (!players[event.target.name].start)
               players[event.target.name].start = +event.date;
         }
         if (event.event === "SPELL_AURA_REMOVED") {
            InitPlayer(event.target.name);
            AddUptime(event.target.name);
         }
      }
      if (options['encounter'] && event.event === "ENCOUNTER_END") {
         for (let playerName in players) {
            AddUptime(playerName);
         }
      }
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
      let table = new Table({
         head: ['Player', options['encounter'] ? 'Uptime (sec)' : 'Uptime (min)'],
      });

      let rows = [];
      for (let playerName in players) {
         let uptime = options['encounter'] ? Math.round(players[playerName].uptime / 1000) : Math.round(players[playerName].uptime / 1000 / 6) / 10;
         rows.push([playerName + (warriors[playerName] ? ' *' : ''), uptime]);
      }
      rows = rows.sort((a, b) => b[1] - a[1]);
      rows.forEach(row => table.push(row));

      console.log(table.toString());

      table = new Table({
         head: ['Warrior', 'Rank', 'Shouts'],
      });

      rows = [];
      for (let warriorName in warriors) {
         let warr = warriors[warriorName];
         for (let rank in warr)
            rows.push([warriorName, rank, warr[rank]]);
      }
      rows = rows.sort((a, b) => b[2] - a[2]);
      rows.forEach(row => table.push(row));

      console.log(table.toString());
   },
}
