#!/usr/bin/env python3
import sys
import os
import matplotlib.pyplot as plt

SWING_EXTENSIONS = ('.normalswings', '.parryswings')

def plot_file(filename):
    with open(filename, 'r') as f:
        numbers = []
        for line in f:
            line = line.strip()
            if line:
                try:
                    numbers.append(float(line))
                except ValueError:
                    continue

    if not numbers:
        print(f"No valid numbers found in {filename}")
        return False

    print(f"\n{filename}:")
    print(f"  Total values: {len(numbers)}")
    print(f"  Min: {min(numbers):.3f}")
    print(f"  Max: {max(numbers):.3f}")
    print(f"  Average: {sum(numbers)/len(numbers):.3f}")

    plt.figure(figsize=(12, 6))
    plt.hist(numbers, bins=100, edgecolor='black', alpha=0.7, color='blue')
    plt.xlabel('Value')
    plt.ylabel('Frequency')
    plt.title(f'Histogram of {os.path.basename(filename)}')
    plt.grid(True, alpha=0.3)
    plt.tight_layout()

    output_filename = f'{filename}.png'
    plt.savefig(output_filename, dpi=150)
    print(f"  Histogram saved as '{output_filename}'")
    plt.close()
    return True

def find_unprocessed_files(directory):
    unprocessed = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(SWING_EXTENSIONS):
                filepath = os.path.join(root, file)
                png_filepath = f'{filepath}.png'
                if not os.path.exists(png_filepath):
                    unprocessed.append(filepath)
    return unprocessed

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 plot-swings.py <filename|directory>")
        sys.exit(1)

    path = sys.argv[1]

    if os.path.isdir(path):
        unprocessed_files = find_unprocessed_files(path)
        if not unprocessed_files:
            print(f"No unprocessed .normalswings or .parryswings files found in {path}")
            sys.exit(0)

        print(f"Found {len(unprocessed_files)} unprocessed file(s)")
        for filepath in unprocessed_files:
            plot_file(filepath)
    elif os.path.isfile(path):
        if not plot_file(path):
            sys.exit(1)
    else:
        print(f"Error: {path} is not a valid file or directory")
        sys.exit(1)

if __name__ == '__main__':
    main()
