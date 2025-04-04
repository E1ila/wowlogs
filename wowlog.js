#!/usr/bin/env node
'use strict';

const
   program = require('commander'),
   consts = require('./consts'),
   moment = require('moment'),
   fs = require('fs'),
   path = require('path'),
   Log = require('./log');

function collect(value, previous) {
   return previous.concat([value]);
}

async function processFile(filename, options, report, func, fileIndex) {
   if (fileIndex != undefined)
      console.log(`====| Processing file ${filename}`);
   report.files++;
   const log = new Log(filename, options, report, func);
   await log.process().catch(e => {
      report.files--;
   });
}

async function processStdin(options, report, func) {
   report.files++;
   const log = new Log(undefined, options, report, func);
   return log.process();
}

program
   .command('<log-path>', 'Path to log file or raw log line to parse')
   .option('--caststart', 'Print also cast start events')
   .option('--dmgheal', 'Show only entries with damage/healing>0')
   .option('--dmg', 'Show only entries with damage')
   .option('--encounter <name>', 'Show only events made during this encounter, use : to add attempt filter, i.e. --encounter Gluth:2')
   .option('--encounters', 'Print detected encounters')
   .option('--ext <extension>', 'Process only files with this extension')
   .option('--filter <CSV>', 'Process only these events, CSV', v => v.split(","), undefined)
   .option('--force', 'Force treating file as log version 9')
   .option('--func <functionName>', 'Print parsed events')
   .option('--guid', 'Print source/target GUID')
   .option('--heals', 'Print only heal spells')
   .option('--lines <range>', 'Scan only lines in this range, format "300-400"')
   .option('--minamount <x>', 'Filter amount greater than')
   .option('--miss <name>', 'Show only this miss type')
   .option('--prefix <prefix>', 'Scan only files starting with this prefix')
   .option('-P, --print', 'Print pretty parsed events')
   .option('--printobj', 'Print parsed events')
   .option('--printraw', 'Print pretty parsed events')
   .option('--resists', 'Calculate resists stats')
   .option('--source <name>', 'Show only events made by this player')
   .option('--spell <name>', 'Show only this spell')
   .option('--spellid', 'Print also spell ID')
   .option('--stand', 'Use AND condition between source and target')
   .option('--sum <field>', 'Aggregate one of: ' + Object.values(consts.fields).join(', '), collect, [])
   .option('--swing', 'Print swing damage')
   .option('--target <name>', 'Show only events made by this player')
   .option('--timediff', 'Measure time difference between events')
   .option('-p, --params <param>', 'Extra parameters passed to custom function', collect, [])
   .option('-v, --verbose', 'Print detailed debug information')
   .action(async (logPath, options) => {
      const report = {
         files: 0,
         startTime: new Date(),
         encounters: {},
      };

      if (options['encounter']) {
         const parts = options['encounter'].split(':');
         if (parts.length > 1) {
            options['encounter'] = parts[0];
            options['encounterAttempt'] = +parts[1];
         }
      }

      if (options['force'])
         options['ignoreVerErr'] = true;
 
      const func = options['func'] && require('./funcs/' + options['func']);
      if (func && func.init)
         await func.init();
      if (logPath === '-')
         await processStdin(options, report, func);
      else if (fs.existsSync(logPath)) {
         if (fs.lstatSync(logPath).isDirectory()) {
            options['dirscan'] = true;
            const files = fs.readdirSync(logPath);
            let fileIndex = 0;
            for (let file of files) {
               if (options['ext'] && !file.endsWith('.' + options['ext']))
                  continue;
               if (options['prefix'] && !file.startsWith(options['prefix']))
                  continue;
               await processFile(path.join(logPath, file), options, report, func, fileIndex++);
            }
         } else
            await processFile(logPath, options, report, func);
      } else {
         // try to parse logPath - should be a line from the combat log
         const parser = require('./parser');
         const event = parser.line(0, logPath, 9);
         console.log(JSON.stringify(event, null, 4));
         const log = new Log("", options, report, func);
         log.printPretty(1, event);
         return;
      }

      const took = moment().diff(moment(report.startTime), 'seconds');
      const encounters = Object.keys(report.encounters).map(key => [key, report.encounters[key]]).sort((a, b) => b[1] - a[1]);

      if (options['dirscan']) {
         console.log(`\n===================================================`);
         console.log(` Finished processing ${report.files} files, took ${took} seconds`);
      }

      if (options['encounters']) {
         console.log(` Encounters:`);
         console.log(encounters.map(row => `    • ${row[1]} ${row[0]}`).join("\n"));
      }
      func && func.finishReport(report, options);
   });

program.parse(process.argv);
