#!/usr/bin/env python3
import re
import matplotlib.pyplot as plt
from collections import defaultdict

def main():
    # Read the file
    with open('Maexxna.txt', 'r') as f:
        lines = f.readlines()

    # Track boss hits and whether they came after a player PARRY
    boss_hits = []
    last_event_was_player_parry = False

    for line in lines:
        # Remove ANSI color codes
        line = re.sub(r'\x1b\[[0-9;]*m', '', line)

        # Parse the line - looking for lines with timestamp
        parts = line.split()
        if len(parts) < 5:
            continue

        try:
            # Extract time since last event (column 4)
            time_since_last = float(parts[3])

            # Get event type (column 5 onwards)
            event_line = ' '.join(parts[4:])

            # If gap > 60 seconds, this is a new battle - reset state
            if time_since_last > 60:
                last_event_was_player_parry = False
                continue

            # Check if player parried the boss (Maexxna missed Hazt PARRY)
            if 'SWING_MISSED' in event_line and 'Maexxna missed' in event_line and 'PARRY' in event_line:
                last_event_was_player_parry = True
                continue

            # Check if this is a boss hit (Maexxna hit or Maexxna missed for other reasons)
            if ('SWING_DAMAGE_LANDED' in event_line or 'SWING_MISSED' in event_line) and event_line.startswith('SWING'):
                # Make sure it's Maexxna doing the action
                if 'Maexxna hit' in event_line or 'Maexxna missed' in event_line:
                    # Skip the duplicate events (time_since_last = 0)
                    if time_since_last == 0:
                        continue

                    # This is a boss swing - record it
                    boss_hits.append({
                        'time_since_last': time_since_last,
                        'after_parry': last_event_was_player_parry
                    })

                    # Reset the parry flag after recording
                    last_event_was_player_parry = False
                else:
                    # Other swing events reset the parry flag
                    last_event_was_player_parry = False

        except (ValueError, IndexError):
            continue

    # Separate hits into two groups
    after_parry = [hit['time_since_last'] for hit in boss_hits if hit['after_parry']]
    not_after_parry = [hit['time_since_last'] for hit in boss_hits if not hit['after_parry']]

    print(f"Total boss hits analyzed: {len(boss_hits)}")
    print(f"Hits after player PARRY: {len(after_parry)}")
    print(f"Hits NOT after player PARRY: {len(not_after_parry)}")

    # Create histogram data
    bins = [i * 0.025 for i in range(0, 201)]  # 0 to 5 seconds in 0.025 second increments (40 bars per second)

    # Create the plots
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10))

    # Plot 1: Hits after PARRY
    ax1.hist(after_parry, bins=bins, edgecolor='black', alpha=0.7, color='red')
    ax1.set_xlabel('Time since last hit (seconds)')
    ax1.set_ylabel('Number of hits')
    ax1.set_title(f'Boss Hit Timing AFTER Player PARRY (n={len(after_parry)})')
    ax1.grid(True, alpha=0.3)
    ax1.set_xlim(0, 5)

    # Plot 2: Hits NOT after PARRY
    ax2.hist(not_after_parry, bins=bins, edgecolor='black', alpha=0.7, color='blue')
    ax2.set_xlabel('Time since last hit (seconds)')
    ax2.set_ylabel('Number of hits')
    ax2.set_title(f'Boss Hit Timing NOT After Player PARRY (n={len(not_after_parry)})')
    ax2.grid(True, alpha=0.3)
    ax2.set_xlim(0, 5)

    plt.tight_layout()
    plt.savefig('boss-hit-analysis.png', dpi=150)
    print("\nPlot saved as 'boss-hit-analysis.png'")

    # Print some statistics
    if after_parry:
        print(f"\nAfter PARRY stats:")
        print(f"  Min: {min(after_parry):.3f}s")
        print(f"  Max: {max(after_parry):.3f}s")
        print(f"  Avg: {sum(after_parry)/len(after_parry):.3f}s")

    if not_after_parry:
        print(f"\nNOT after PARRY stats:")
        print(f"  Min: {min(not_after_parry):.3f}s")
        print(f"  Max: {max(not_after_parry):.3f}s")
        print(f"  Avg: {sum(not_after_parry)/len(not_after_parry):.3f}s")

if __name__ == '__main__':
    main()
