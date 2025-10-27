# Boss Swing Analysis

This file contains swing timer analysis data for various bosses, including swing times, parry-haste mechanics, and attack type distributions.

## Data Collection Methodology

The analysis data was generated using a three-step process:

### 1. Extract Boss Hits
Running the `parryhaste` script extracts all boss melee hits from combat logs, identifies parries, and sorts events chronologically:
```bash
parryhaste BOSS_NAME LOG_DIR --ff _Naxx_ --ext txt
```
Output: `boss_hits.txt` - Contains timestamped boss swing data with parry events flagged.

### 2. Analyze Swing Timers
The Python analysis script processes the extracted hits to calculate time deltas between swings and generates visualizations:
```bash
python3 analyse-boss-hits.py boss_hits.txt BOSS_NAME
```
Output: Plot image showing swing time distributions for:
- Normal swings (baseline swing timer)
- Post-parry swings (demonstrating parry-haste mechanic)

### 3. Calculate Attack Statistics
The `boss-swing-timers` script computes comprehensive statistics:
```bash
boss-swing-timers LOGS_DIR BOSS_NAME
```
Output: Statistical analysis including:
- Attack type probabilities (Normal/Crit/Crushing/Thrash)
- Average normal swing timer
- Average parry-haste swing timer
