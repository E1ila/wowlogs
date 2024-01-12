'use strict';

const Table = require('cli-table');
const c = require("../colors");
const CsvTable = require('../csvtable');
const path = require('path');
const playerProcs = {};
const colors = require('ansi-256-colors');
const moment = require('moment');
const classColor = {
   "Druid": colors.fg.getRgb(Math.round(5), Math.round(0.49 * 5), Math.round(0.04 * 5)),
   "Hunter": colors.fg.getRgb(Math.round(0.67 * 5), Math.round(0.83 * 5), Math.round(0.45 * 5)),
   "Mage": colors.fg.getRgb(Math.round(0.25 * 5), Math.round(0.78 * 5), Math.round(0.92 * 5)),
   "Paladin": colors.fg.getRgb(Math.round(0.96 * 5), Math.round(0.55 * 5), Math.round(0.73 * 5)),
   "Priest": colors.fg.getRgb(5, 5, 5),
   "Rogue": colors.fg.getRgb(5, Math.round(0.96 * 5), Math.round(0.41 * 5)),
   "Shaman": colors.fg.getRgb(0, Math.round(0.44 * 5), Math.round(0.87 * 5)),
   "Warlock": colors.fg.getRgb(Math.round(0.53 * 5), Math.round(0.53 * 5), Math.round(0.93 * 5)),
   "Warrior": colors.fg.getRgb(Math.round(0.78 * 5), Math.round(0.61 * 5), Math.round(0.43 * 5)),
};

let dbItems = null;
let dbPlayer = null;
let players = {};
let playerByName = {};
let frostResColumn = -1;
let airPhases = 0;
let fightStart = 0;
let fightEnd = 0;
let playerDeaths = 0;
let wipe = true;
let decurses = {};

const FrostboltSpellId = 28479;
const GreaterFrostProtSpellId = 17544;
const FrostProtSpellId = 7239;

module.exports = {
   init: async function() {
      // console.log(`Reading items DB...`)
      dbItems = new CsvTable();
      await dbItems.read(path.join(__dirname, '..', 'wowitems.csv.gz'), ['entry']);
      // console.log(`Items DB contains ${dbItems.rows.length} rows`);
      frostResColumn = dbItems.headers.indexOf("frost_res");
      
      dbPlayer = new CsvTable();
      await dbPlayer.read(path.join(__dirname, '..', 'players.csv.gz'), ['name']);
   },
   
   /**
   * Finds what spells triggers an aura.
   * @param log sender obj
   * @param options sent in CLI
   * @param lineNumber of processed event
   * @param event object
   * @param lastEvent object
   */
   processEvent: function (log, options, lineNumber, event, lastEvent, currentEncounter) {
      if (!currentEncounter || currentEncounter.encounterId != 1114)
         return;

      let result = {printPretty: false};
      const spellEvent = ['SPELL_DAMAGE', 'SPELL_MISSED'].indexOf(event.event);
      
      if (event.target && event.target.guid.indexOf('Player-') === 0) {
         const player = players[event.target.guid];
         if (!player)
            throw new Error(`Can't find player with event.target.guid ${event.target.guid}`);
         player.name = event.target.name;
      }

      if (event.event === 'ENCOUNTER_START') {
         airPhases = 0;
         players = {};
         playerByName = {};
         fightStart = event.date;
         playerDeaths = 0;
         wipe = true;
      }
      else if (event.event === 'ENCOUNTER_END') {
         if (!fightEnd || !wipe)
         fightEnd = event.date;
      }
      else if (event.event === 'UNIT_DIED') {
         if (event.target.guid.indexOf('Player-') === 0) {
            playerDeaths += 1;
            const player = players[event.target.guid];
            if (player)
            player.died = event.date;
            fightEnd = event.date;
            result.printPretty = true;
         } else if (currentEncounter && event.target.name === currentEncounter.encounterName) {
            wipe = false;
            result.printPretty = true;
         }
      }
      else if (event.event === "COMBATANT_INFO") {
         // dbItems.get();
         let fr = 0;
         for (let gear of event.playerEquippedGear) {
            let item = dbItems.get("entry", gear.itemId);
            fr += +item[frostResColumn];
         }
         players[event.playerGuid] = {fr, absorbed: 0, resisted: 0, damage: 0, ticks: 0, died: null, fpp: 0, gfpp: 0, guid: event.playerGuid};
      }
      else if (event.event === 'SPELL_DISPEL' && event.source && event.target) { //  && eligable[event.source.name]
         // result.printPretty = true;
         if (!decurses[event.source.name])
         decurses[event.source.name] = {};
         decurses[event.source.name][event.extraSpellName] = (decurses[event.source.name][event.extraSpellName] || 0) + 1;
         // result.printPretty = true;
      } 
      else if (event.event === 'SPELL_AURA_APPLIED' && [FrostProtSpellId, GreaterFrostProtSpellId].indexOf(event.spell.id) != -1) {
         result.printPretty = true;
         const player = players[event.target.guid];
         if (event.spell.id == GreaterFrostProtSpellId)
            player.gfpp += 1;
         else 
            player.fpp += 1;
      } 
      else if (  spellEvent != -1 && 
         event.spell && FrostboltSpellId === event.spell.id && 
         event.source.name === currentEncounter.encounterName &&
         event.target && event.target.guid.indexOf('Player-') === 0) {
            
            const player = players[event.target.guid];
            player.ticks += 1;
            playerByName[player.name] = player;
            
            if (spellEvent === 0) {
               player.damage += event.amount;
               player.resisted += event.resisted; 
               player.absorbed += event.absorbed;
            } else {
               if (event.missType === 'ABSORB')
               player.absorbed += event.amount;
               else if (event.missType === 'RESIST')
               player.resisted += 600; // Frost Aura full damage
            }
         } 
         
         return result;
      },
      
      finishFile: function (log, options) {
         // nothing to do when file finished
      },
      
      finishReport: function (report, options) {
         console.log(`\n${c.whiteBright}${'Player'.padEnd(25)} ${'FrR'.padStart(5)} ${'Dmg taken'.padStart(10)} ${'Absorbed'.padStart(10)} ${'Resisted'.padStart(10)} ${'GFPP'.padStart(5)} ${'FPP'.padStart(5)}  ${'Activity'.padEnd(10)}${c.off}`);
         console.log(''.padEnd(100, '-'));
         
         const fightLength = moment(fightEnd).diff(moment(fightStart), 'seconds');
         
         let frMelee = {sum: 0, count: 0};
         let frHealers = {sum: 0, count: 0};
         let overallDamage = 0;
         let rows = [];
         for (let player of Object.values(players)) {
            player.activity = player.died ? moment(player.died).diff(moment(fightStart), 'seconds') / fightLength : 1;
            rows.push([
               player.name || player.guid, ''+player.fr, 
               player.damage.toLocaleString(), 
               player.absorbed.toLocaleString(), 
               player.resisted.toLocaleString(), 
               player.gfpp.toLocaleString(),
               player.fpp.toLocaleString(),
               player.died ? c.red + Math.round(player.activity * 100)+c.redDark+'%'+c.off : '100%', 
               player
            ]);
            overallDamage += player.damage;
            const playerInfo = dbPlayer.get('name', player.name);
            if (playerInfo) {
               if (['Shaman', 'Priest', 'Druid'].indexOf(playerInfo[2]) != -1) {
                  frHealers.sum += player.fr;
                  frHealers.count++;
               } else {
                  frMelee.sum += player.fr;
                  frMelee.count++;               
               }
            }
         }
         const playerSortScore = (player) => (player.resisted);
         rows = rows.sort((a, b) => playerSortScore(b[8]) - playerSortScore(a[8]));
         rows.forEach(row => {
            if (row.length) {
               const playerInfo = dbPlayer.get('name', row[0]);
               console.log(`${playerInfo ? classColor[playerInfo[2]] : c.off}${(row[0] || '??').padEnd(25)}${c.off} ${row[8].fr>200 ? c.greenBright : (row[8].fr>150 ? c.green : (row[8].fr>100 ? c.orange : (row[8].fr<50 ? c.red : c.orangeDark)))}${row[1].padStart(5)}${c.off} ${row[2].padStart(10)}${c.off} ${row[8].absorbed>7000 ? c.greenBright : (row[8].absorbed>4500 ? c.green : (row[8].absorbed<2000 ? c.redDark : c.off))}${row[3].padStart(10)}${c.off} ${row[4].padStart(10)} ${row[5].padStart(5)} ${row[6].padStart(5)}  ${row[7].padEnd(10)}${c.off}`);
               // ${row[6].damage>40000 ? c.redDark : (row[6].damage>20000 ? c.orangeDark : (row[6].damage>10000 ? c.greenDark : c.green))}
            }
         });
         console.log(`\nOverall damage taken: ${overallDamage.toLocaleString()}\nAverage DPS FrR: ${Math.round(frMelee.sum / frMelee.count)}\nAverage Healer FrR: ${Math.round(frHealers.sum / frHealers.count)}\nAir phases: ${airPhases}\nFight length: ${fightLength.toLocaleString()} seconds\nDeaths: ${playerDeaths}\nResult: ${wipe ? 'wipe' : 'kill'}\n`);
         
         console.log(`\nPlayer,FrR,Dmg taken,Absorbed,Resisted,GFPP,FPP,Activity`);
         rows.filter(row => row.length && row[8].activity > 0.98).forEach(row => {
            console.log(`${row[0] || '??'},${row[8].fr},${row[8].damage},${row[8].absorbed},${row[8].resisted},${row[8].gfpp},${row[8].fpp},${row[8].activity}`);
         });

         console.log(`\nDecurses:`);
         let head = ['Player', 'Activity'];
         const existingHeaders = head.length;
         rows = [];
         for (let name in decurses) {
            const stats = decurses[name];
            const playerInfo = dbPlayer.get('name', name);
            const player = playerByName[name];
            let participation = player.died ? c.red + Math.round(moment(player.died).diff(moment(fightStart), 'seconds') / fightLength * 100)+c.redDark+'%'+c.off : '100%';
            let row = [(playerInfo ? classColor[playerInfo[2]] : c.off) + name + c.off, participation];
            for (let i = 0; i < head.length - existingHeaders; i++) 
               row.push(0);
            for (let spellName in stats) {
               let index = head.indexOf(spellName);
               if (index === -1) {
                  head.push(spellName);
                  row.push(0);
                  index = row.length - 1;
               }
               row[index] = stats[spellName];
            }
            rows.push(row);
         }
         rows.forEach(row => {
            // fix number of items
            for (let i = row.length; i < head.length; i++)
               row.push(0);
         });
         var table = new Table({head});
         rows.forEach(row => table.push(row));
         console.log(table.toString());

         // rows = [];
         // for (let player of Object.values(players)) {
         //    const playerInfo = dbPlayer.get('name', player.name);
         //    if (!playerInfo || ['Shaman', 'Priest', 'Druid'].indexOf(playerInfo[2]) == -1) {
         //       rows.push([(playerInfo ? classColor[playerInfo[2]] : c.off) + (player.name || player.guid).padEnd(30) + c.off, player.gfpp, player.fpp]);
         //    }
         // }
         // rows = rows.sort((a, b) => b[1]+b[2]-a[1]-a[2]);
         // console.log(`\nDPS Frost Protection Potions:\n`);
         // console.log(`${'Player'.padEnd(30)} ${'GFPP'.padEnd(6)} ${'FPP'.padEnd(6)} \n------------------------------------------------------------`);
         // rows.forEach(row => {
         //    console.log(`${row[0]} ${row[1].toLocaleString().padEnd(6)} ${row[2].toLocaleString().padEnd(6)} `);
         // });
         
      },
   }
   