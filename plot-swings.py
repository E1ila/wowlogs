#!/usr/bin/env python3
import sys
import matplotlib.pyplot as plt

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 plot-swings.py <filename>")
        sys.exit(1)

    filename = sys.argv[1]

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
        print("No valid numbers found in file")
        sys.exit(1)

    print(f"Total values: {len(numbers)}")
    print(f"Min: {min(numbers):.3f}")
    print(f"Max: {max(numbers):.3f}")
    print(f"Average: {sum(numbers)/len(numbers):.3f}")

    plt.figure(figsize=(12, 6))
    plt.hist(numbers, bins=50, edgecolor='black', alpha=0.7, color='blue')
    plt.xlabel('Value')
    plt.ylabel('Frequency')
    plt.title(f'Histogram of {filename}')
    plt.grid(True, alpha=0.3)
    plt.tight_layout()

    output_filename = f'{filename}.png'
    plt.savefig(output_filename, dpi=150)
    print(f"\nHistogram saved as '{output_filename}'")

if __name__ == '__main__':
    main()
