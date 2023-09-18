const readline = require('readline');
const fs = require('fs');
const parser = require('./parser');
const consts = require('./consts');
const c = require('./colors');

const IgnoreFails = [
   "Not enough energy",
   "Not yet recovered",
   "Out of range",
];

module.exports = class Log {

   constructor(filename, options, report, customFunc) {
      this.filename = filename;
      this.options = options;
      this.customFunc = customFunc;
      this.report = report;
      this.currentEncounter = null;
      this.summonedObjects = {};
      this.initResult();
   }

   process() {
      return new Promise((resolve, reject) => {
         let versionData = { version: 0, advanced: 0, build: null, projectId: 0 };
         let lineNumber = 0;
         let lastEvent;

         const readInterface = readline.createInterface({
            input: fs.createReadStream(this.filename),
            // output: process.stdout,
            console: false
         });

         readInterface.on('line', line => {
            lineNumber++;
            if (line.indexOf('COMBAT_LOG_VERSION') !== -1) {
               const data = line.split('  ')[1].split(',');
               versionData = {
                  version: parseFloat(data[1]),
                  advanced: data[3] == '1',
                  build: data[5],
                  projectId: parseFloat(data[7]),
               }
            } else {
               let event;
               try {
                  event = parser.line(lineNumber, line, versionData.version);
               } catch (e) {
                  if (e.message.indexOf('Unsupported version:') !== -1) {
                     if (!this.options['ignoreVerErr'])
                        console.error(e.message);
                     return reject('Unsupported combat log version');
                  } else {
                     console.error(line);
                     console.error(`Failed parsing line #${lineNumber}: ${e.stack}`);
                  }
               }
               if (event) {
                  try {
                     this.processEvent(lineNumber, event, lastEvent);
                  } catch (e) {
                     console.error(`#${lineNumber} EVENT ` + JSON.stringify(event));
                     console.error(`Failed processing event #${lineNumber}: ${e.stack}`);
                  }
               }
               lastEvent = event;
            }
         });

         readInterface.on('close', line => {
            this.finish();
            resolve();
         });
      });
   }

   processEvent(lineNumber, event, lastEvent) {
      let encounterStartOrStop = false;
      let endedEncounter = null;
      if (event.event === 'ENCOUNTER_START') {
         this.report.encounters[event.encounterName] = (this.report.encounters[event.encounterName] || 0) + 1;
         this.currentEncounter = event;
         encounterStartOrStop = true;
      } else if (event.event === 'ENCOUNTER_END') {
         endedEncounter = this.currentEncounter;
         this.currentEncounter = null;
         encounterStartOrStop = true;
      }

      if (this.options['encounter'] && (!(this.currentEncounter || endedEncounter) || (this.currentEncounter || endedEncounter).encounterName.toLowerCase() != this.options['encounter'].toLowerCase()))
         return;

      if (this.options['encounterAttempt'] && this.currentEncounter && this.report.encounters[this.currentEncounter.encounterName] != this.options['encounterAttempt'])
         return;

      if (!encounterStartOrStop) {
         // use filters for rows other than encounter start/stop
         if (this.options['spell'] && !((event.spell && event.spell.name.toLowerCase() === this.options['spell'].toLowerCase()) || (event.spellName && event.spellName.toLowerCase() === this.options['spell'].toLowerCase())))
            return;

         if (this.options['miss'] && !(event.missType && event.missType.toLowerCase() === this.options['miss'].toLowerCase()))
            return;

         if (this.options['dmgheal'] && !(event.amount > 0 && event.event != 'SPELL_ENERGIZE'))
            return;

         if (this.options['filter']) {
            if (this.options['filter'].indexOf(event.event) === -1)
               return;
         }
         let sourceMatch = !this.options['source'] || (event.source && (event.source.name == this.options['source'] || event.source.guid === this.options['source']));
         let targetMatch = !this.options['target'] || (event.target && (event.target.name == this.options['target'] || event.target.guid === this.options['target']));
         let unitDied = event.event === 'UNIT_DIED' && (sourceMatch || targetMatch)
         if (!unitDied || !this.options['encounter']) {
            if (this.options['stand'] || !this.options['source'] || !this.options['target']) {
               if (!sourceMatch || !targetMatch) // AND condition between sournce and target
                  return;
            } else {
               if (!sourceMatch && !targetMatch) // OR condition between sournce and target
                  return;
            }
         }
      }
      if (this.options['printobj'])
         console.log(`#${lineNumber} EVENT ` + JSON.stringify(event));

      let customFuncResult = {};
      if (this.customFunc)
         customFuncResult = this.customFunc.processEvent(this, this.options, lineNumber, event, lastEvent, this.currentEncounter);

      if (this.options['print'] || customFuncResult && (customFuncResult.printPretty || encounterStartOrStop))
         this.printPretty(lineNumber, event, customFuncResult, this.options['timediff']);

      const sumFields = this.options['sum'];
      if (sumFields) {
         for (let sumField of sumFields) {
            switch (sumField) {
               case 'damage':
                  if (event.amount > 0 && ['SPELL_DAMAGE', 'SWING_DAMAGE_LANDED', 'SPELL_PERIODIC_DAMAGE'].indexOf(event.event) != -1) 
                     this.sumField(sumField, event.source, event.amount);
                  break;
               case 'dmgfr':
                  if (event.amount > 0 && ['SPELL_DAMAGE', 'SWING_DAMAGE_LANDED', 'SPELL_PERIODIC_DAMAGE'].indexOf(event.event) != -1 && event.source.guid.indexOf('Player-') === 0) 
                     this.sumField(sumField, event.source, event.amount);
                  break;   
               case 'healing':
                  if (sumField === 'healing' && event.amount > 0 && 'SPELL_HEAL' === event.event) 
                     this.sumField(sumField, event.source, event.amount);
                  break;
               case 'count':
                  this.sumField(sumField, event.source, 1);
                  break;   
            }
         }
      } 
   }

   sumField(field, source, amount) {
      if (!this.result.sum[field][source.guid])
         this.result.sum[field][source.guid] = {name: source.name, amount: 0, hits: 0};
         this.result.sum[field][source.guid].amount += amount;
         this.result.sum[field][source.guid].hits++;
         this.result.sum[field].Total += amount;
   }

   initResult() {
      this.result = {};
      if (this.options['sum'].length) {
         this.options['sum'].forEach(field => field.toLowerCase());
         this.result.sum = {};
         for (let field of this.options['sum']) {
            this.result.sum[field] = {Total: 0};
         }
      }
   }

   ensureEntry(obj, name, defaultValue) {
      if (obj[name] === undefined)
         obj[name] = defaultValue;
   }

   getPrettyEntityName(entity) {
      let summonedBy = this.summonedObjects[entity.guid];
      if (summonedBy)
         return this.getPrettyEntityName(summonedBy)
      const color = entity.guid.indexOf("Player-") ? c.blue : c.blueRed;
      return color + entity.name.split('-')[0];
   }

   printPretty(lineNumber, event, customFuncResult, printTimeDiff) {
      switch (event.event) {
         case 'SPELL_AURA_REMOVED_DOSE':
         case 'SWING_DAMAGE':
         // case 'SPELL_EXTRA_ATTACKS':
         case 'SPELL_AURA_APPLIED_DOSE':
         case 'SPELL_AURA_REFRESH':
         case 'SPELL_CAST_START':
         case 'COMBATANT_INFO':
         case 'SPELL_PERIODIC_ENERGIZE':
            return;
      }

      const isSpellEnergize = event.event == 'SPELL_ENERGIZE';
      let s = `${c.grayDark}${(''+lineNumber).padStart(10)}   ${event.dateStr} `;
      if (printTimeDiff) {
         let diff = this.lastEventTime ? (+event.date - this.lastEventTime) / 1000 : 0;
         s += `  ${diff}`.padStart(10);
         this.lastEventTime = +event.date;
      }
      s += `  ${c.grayDark}${event.event}`.padEnd(40);

      if (event.event === 'ENCOUNTER_START') {
         // s += `🟩 ------- Encounter Start: ${c.gray}${event.encounterName}${c.grayDark} -------`;
         // console.log(s + c.off);
         return;
      } else if (event.event === 'ENCOUNTER_END') {
         // s += `🟥 ------- Encounter End: ${c.gray}${event.encounterName}${c.grayDark} -------`;
         // console.log(s + c.off);
         return;
      }

      if (event.event === 'SPELL_EXTRA_ATTACKS') {
         if (event.source && event.source.name)
            s += ` ${this.getPrettyEntityName(event.source)} ${c.gray}gained ${c.grayDark}extra attack from ${c.gray}${event.spell.name}`;
      } else if (event.event === 'SPELL_AURA_BROKEN') {
         // SPELL_AURA_BROKEN
         if (event.source && event.source.name)
            s += ` ${this.getPrettyEntityName(event.source)} ${c.gray}broken`;
         if (event.spell)
            s += ` ${c.orange}${event.spell.name}`;
         if (event.spellName)
            s += ` ${c.orange}${event.spellName}`;         
         if (event.target && event.target.name)
            s += ` ${c.gray}of ${this.getPrettyEntityName(event.target)}`;
      } else if (event.event === 'SPELL_AURA_APPLIED') {
         // SPELL_AURA_APPLIED
         if (event.source && event.source.name)
            s += ` ${this.getPrettyEntityName(event.source)} ${c.gray}caused`;
         if (event.spell)
            s += ` ${c.orange}${event.spell.name}`;
         if (event.spellName)
            s += ` ${c.orange}${event.spellName}`;         
         if (event.target && event.target.name)
            s += ` ${c.gray}on ${this.getPrettyEntityName(event.target)}`;
      } else if (event.event === 'SPELL_AURA_REMOVED') {
         // SPELL_AURA_REMOVED
         if (event.source && event.source.name)
            s += ` ${this.getPrettyEntityName(event.source)}`;
         if (event.spell)
            s += ` ${c.orange}${event.spell.name}`;
         if (event.spellName)
            s += ` ${c.orange}${event.spellName}`;         
         s += ` ${c.gray}aura faded`
         if (customFuncResult && customFuncResult.stunDuration)
            s += ` ${c.cyanDark}stunned ${customFuncResult.stunDuration/1000} sec`;
         if (customFuncResult && customFuncResult.frenzyDuration)
            s += ` ${c.cyanDark}frenzy for ${customFuncResult.frenzyDuration/1000} sec`;
      } else {
         // SPELL_CAST_SUCCESS 
         // SWING_DAMAGE
         // SPELL_CAST_FAILED
         // SPELL_MISSED

         if (IgnoreFails.indexOf(event.failedType) != -1)
            return;

         if (event.zoneName)
            s += ` ${c.purple}${event.zoneName}`;
         if (event.encounterName)
            s += ` ${c.purple}${event.encounterName}`;
         let amountColor = c.red;
         if (event.source && event.source.name)
            s += ` ${this.getPrettyEntityName(event.source)}`;
         if (event.event === 'SPELL_DISPEL')
            s += ` ${c.gray}dispelled`
         if (event.eventSuffix != 'INTERRUPT' && event.extraSpellName)
            s += ` ${c.orange}${event.extraSpellName}`;
         if (event.eventSuffix == 'AURA_BROKEN_SPELL')
            s += ` ${c.redDark}broke`;
         if (event.eventSuffix == 'SUMMON') {
            s += ` ${c.gray}summon`;
            if (event.target)
               this.summonedObjects[event.target.guid] = event.source;
         }
         if (event.event === 'PARTY_KILL')
            s += ` ${c.gray}killing blow`
         if (event.absorbedSpell) {
            s += ` ${c.orange}${event.absorbedSpell.name}`;
         } else {
            if (!event.target || !event.target.name)
               s += ` ${c.gray}performs`;
            else if (isSpellEnergize) {
               s += ` ${c.gray}gains ${c.greenDark}${event.amount} ${c.gray}energy from`;
            }
            if (event.spell) {
               if (event.event === 'SPELL_DISPEL')
                  s += ` ${c.gray}using`
               s += ` ${c.orange}${event.spell.name}`;
               if (event.event === 'SPELL_DISPEL')
                  s += ` ${c.gray}on`
            }
            if (event.spellName)
               s += ` ${c.orange}${event.spellName}`;
         }
         if (event.eventSuffix == 'ABSORBED') 
         s += ` ${c.gray}absorbed by`;
         if (event.eventSuffix == 'DAMAGE_LANDED' || event.event == 'DAMAGE_SHIELD')
            s += ` ${c.gray}hit`;
         if (event.eventSuffix == 'MISSED')
            s += ` ${c.gray}missed`;
         if (event.eventSuffix == 'INTERRUPT')
            s += ` ${c.cyan}interrupted`;
         if (event.eventSuffix == 'HEAL') {
            s += ` ${c.gray}healed`;
            amountColor = c.green;
         }
         if (event.target && event.target.name) {
            if (!isSpellEnergize || event.target.name != event.source.name)
               s += ` ${this.getPrettyEntityName(event.target)}`;
            if (event.event == 'UNIT_DIED')
               s += ` ${c.red}died ☠️`;
         }
         if (event.eventSuffix == 'INTERRUPT' && event.extraSpellName)
            s += ` ${c.orange}${event.extraSpellName}`;
         if (event.amount > 0 && !isSpellEnergize) {
            s += ` ${c.gray}for ${amountColor}${event.amount}`;
            if (event.eventSuffix != 'HEAL') {
               if (event.event != 'SPELL_ENERGIZE') {
                  if (event.absorbedSpell)
                     s += ` ${c.gray}${event.absorbedSpell.school.toLowerCase()} damage`;
                  else if (event.spell)
                     s += ` ${c.gray}${event.spell.school.toLowerCase()} damage`;
                  else if (event.school && event.school.length > 0)
                     s += ` ${c.gray}${event.school.toLowerCase()} damage`;
                  else
                     s += ` ${c.gray}melee damage`;
               }
            }
            if (event.resisted > 0)
               s += ` ${c.gray}(${event.resisted} resisted)`;
            if (event.blocked > 0)
               s += ` ${c.gray}(${event.blocked} blocked)`;
            if (event.absorbed > 0)
               s += ` ${c.gray}(${event.absorbed} absorbed)`;
            if (event.overheal > 0)
               s += ` ${c.gray}(${event.overheal} overheal)`;
         }
         if (event.eventSuffix == 'CAST_FAILED') {
            s += ` ${c.gray}failed`;
            if (event.failedType)
               s += ` (${event.failedType})`;
         }
         if (event.missType) 
            s += ` ${c.red}${event.missType}`;
      }
      console.log(s + c.off);
   }

   finish() {
      if (this.customFunc)
         this.customFunc.finishFile(this, this.options);

      if (this.result.sum) {
         for (let field in this.result.sum) {
            console.log(`${field.toUpperCase()}:`)
            const outputPerSource = this.result.sum[field];
            let arr = [];
            for (let guid in outputPerSource) {
               const output = outputPerSource[guid];
               if (output >= 0)
                  arr.push([guid, '--', outputPerSource[guid]]);
               else 
                  arr.push([output.name, output.hits, output.amount]);
            }
            arr = arr.sort((a, b) => b[1]-a[1]);
            console.log(`  ${'damage'.toLocaleString('en').padStart(12)} ${'hits'.padStart(2)}  source`);
            for (let pair of arr)
               console.log(`  ${pair[2].toLocaleString('en').padStart(12)}  ${(''+pair[1]).padStart(2)}  ${pair[0]}`);
         }
      }
   }
}
