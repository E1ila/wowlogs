const
    fs = require('fs'),
    program = require('commander')
    COL_PUSHED_DEBUFF = 0,
    COL_PUSHED_BY = 1
    COL_OCCUR = 2;

let debuffId = 0;

program
    .command('<prio-csv>', 'Output file with pushed off debuffs')
    .action(async (csvFilename, options) => {
        if (!fs.existsSync(csvFilename)) {
            console.error(`File ${csvFilename} does not exist.`);
            process.exit(1);
        }
        const lines = fs.readFileSync(csvFilename).toString('utf8').split('\n');
        if (lines.length === 0) {
            console.error(`File ${csvFilename} is empty.`);
            process.exit(1);
        }
        const header = lines.shift().split(',');
        
        let debuffs = {};  // debuff_name -> [prio_index, sub_index]
        let pushedInfo = [];

        // first generate a flat prio list, we'll sort it later
        for (let line of lines) {
            const cols = line.split(',');
            if (cols.length < 3)
                continue;
            const pushedDebuff = cols[COL_PUSHED_DEBUFF];
            const pushedBy = cols[COL_PUSHED_BY];
            const occur = cols[COL_OCCUR];
            pushedInfo.push({pushedDebuff, pushedBy, occur});
            if (!debuffs[pushedDebuff]) 
                debuffs[pushedDebuff] = [];
            debuffs[pushedDebuff].push(pushedBy);
            if (!debuffs[pushedBy]) 
                debuffs[pushedBy] = [];
        }

        let prio = [];
        for (let debuff in debuffs) 
            prio.push([debuffs[debuff].length, debuff]);
        prio = prio.sort((a, b) => a[0] - b[0]);

        console.log(`Prio \n------------\n${prio.map(p => p.join(',') + ',' + debuffs[p[1]].join(' | ')).join('\n')}`);

        process.exit(0);
    });

program.parse(process.argv);
