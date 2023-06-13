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

async function processFile(filename, options, report, func) {
   console.log(`====| Processing file ${filename}`);
   report.files++;
   const log = new Log(filename, options, report, func);
   await log.process().catch(e => {
      report.files--;
   });
}

program
   .command('<log-path>', 'Path to log file or raw log line to parse')
   .option('-v, --verbose', 'Print detailed debug information')
   .option('--printobj', 'Print parsed events')
   .option('--print', 'Print pretty parsed events')
   .option('--func <functionName>', 'Print parsed events')
   .option('--filter <CSV>', 'Process only these events, CSV', v => v.split(","), undefined)
   .option('--ignore-ver-err', 'Ignore combat log version errors')
   .option('--sum <field>', 'Aggregate one of: ' + Object.values(consts.fields).join(', '), collect, [])
   .option('--ext <extension>', 'Process only files with this extension')
   .option('--params <param>', 'Extra parameters passed to custom function', collect, [])
   .option('--source <name>', 'Show only events made by this player')
   .option('--target <name>', 'Show only events made by this player')
   .option('--spell <name>', 'Show only this spell')
   .option('--miss <name>', 'Show only this miss type')
   .option('--dmgheal', 'Show only entries with damage/healing')
   .option('--stand', 'Use AND condition between source and target')
   .option('--encounter <name>', 'Show only events made during this encounter, use : to add attempt filter, i.e. --encounter Gluth:2')
   .option('--timediff', 'Measure time difference between events')
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

      const func = options['func'] && require('./funcs/' + options['func']);
      if (fs.existsSync(logPath)) {
         if (fs.lstatSync(logPath).isDirectory()) {
            const files = fs.readdirSync(logPath);
            for (let file of files) {
               if (options['ext'] && !file.endsWith('.' + options['ext']))
                  continue;
               await processFile(path.join(logPath, file), options, report, func);
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

      console.log(`\n===================================================`);
      console.log(` Finished processing ${report.files} files, took ${took} seconds`);
      console.log(` Encounters:`);
      console.log(encounters.map(row => `    • ${row[1]} ${row[0]}`).join("\n"));
      console.log(`===================================================\n`);

      func && func.finishReport(report, options);
   });

program.parse(process.argv);
