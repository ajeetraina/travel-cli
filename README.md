# 🛫 Travel CLI

A command-line tool for searching flights using the Google Flights MCP (Model Context Protocol) server.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![License](https://img.shields.io/badge/License-MIT-blue)
![MCP](https://img.shields.io/badge/MCP-Compatible-purple)

## Features

- 🔍 **Search one-way flights** - Find flights for a specific date
- 🔄 **Round-trip search** - Search for return flights
- 📊 **Compare dates** - Find the best prices across a date range
- ⚡ **Quick search** - Fast searches with natural language dates
- 📋 **Beautiful tables** - Color-coded, easy-to-read output
- 🏷️ **Smart sorting** - Sort by price or duration

## Prerequisites

- Node.js 18 or higher
- npm or yarn

## Installation

```bash
# Clone the repository
git clone https://github.com/ajeetraina/travel-cli.git
cd travel-cli

# Install dependencies
npm install

# Link globally (optional)
npm link
```

## Usage

### Search One-Way Flights

```bash
# Basic search
travel-cli search -f BLR -t DEL -d 2025-12-20

# Search with options
travel-cli search --from BLR --to SFO --date 2026-03-10 --class business

# Show fastest flight only
travel-cli search -f BLR -t DEL -d 2025-12-20 --fastest

# Show cheapest flight only
travel-cli search -f BLR -t DEL -d 2025-12-20 --cheapest

# Sort by duration
travel-cli search -f BLR -t SFO -d 2026-03-10 --sort duration

# Show all results
travel-cli search -f BLR -t DEL -d 2025-12-20 --all

# Multiple passengers
travel-cli search -f BLR -t DEL -d 2025-12-20 -p 2
```

### Search Round-Trip Flights

```bash
# Basic round-trip
travel-cli roundtrip -f BLR -t SFO -d 2026-03-10 -r 2026-03-20

# With options
travel-cli roundtrip --from BLR --to SFO --depart 2026-03-10 --return 2026-03-20 --class business

# Show cheapest only
travel-cli roundtrip -f BLR -t SFO -d 2026-03-10 -r 2026-03-20 --cheapest
```

### Compare Flights Across Date Range

```bash
# Find best prices in a date range
travel-cli compare -f BLR -t SFO --start 2026-03-01 --end 2026-03-15

# With stay duration constraints
travel-cli compare -f BLR -t SFO --start 2026-03-01 --end 2026-03-15 --min-stay 5 --max-stay 10

# Show only cheapest for each date pair
travel-cli compare -f BLR -t DEL --start 2025-12-15 --end 2025-12-25 --cheapest
```

### Quick Search

```bash
# Search with natural language
travel-cli quick blr-del tomorrow
travel-cli quick ixj-del today
travel-cli quick blr-sfo 2026-03-10
```

## Command Reference

### `search` - One-way flight search

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--from` | `-f` | Origin airport code | Required |
| `--to` | `-t` | Destination airport code | Required |
| `--date` | `-d` | Travel date (YYYY-MM-DD) | Required |
| `--passengers` | `-p` | Number of passengers | 1 |
| `--class` | `-c` | Seat class (economy/business) | economy |
| `--sort` | `-s` | Sort by (price/duration) | price |
| `--fastest` | | Show only fastest flight | false |
| `--cheapest` | | Show only cheapest flight | false |
| `--all` | `-a` | Show all results | false |
| `--limit` | `-l` | Number of results | 10 |

### `roundtrip` - Round-trip flight search

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--from` | `-f` | Origin airport code | Required |
| `--to` | `-t` | Destination airport code | Required |
| `--depart` | `-d` | Departure date (YYYY-MM-DD) | Required |
| `--return` | `-r` | Return date (YYYY-MM-DD) | Required |
| `--passengers` | `-p` | Number of passengers | 1 |
| `--class` | `-c` | Seat class (economy/business) | economy |
| `--sort` | `-s` | Sort by (price/duration) | price |
| `--cheapest` | | Show only cheapest option | false |
| `--all` | `-a` | Show all results | false |
| `--limit` | `-l` | Number of results | 10 |

### `compare` - Compare flights across date range

| Option | Description | Default |
|--------|-------------|---------|
| `--from`, `-f` | Origin airport code | Required |
| `--to`, `-t` | Destination airport code | Required |
| `--start` | Start date of range (YYYY-MM-DD) | Required |
| `--end` | End date of range (YYYY-MM-DD) | Required |
| `--min-stay` | Minimum stay duration (days) | - |
| `--max-stay` | Maximum stay duration (days) | - |
| `--passengers`, `-p` | Number of passengers | 1 |
| `--class`, `-c` | Seat class | economy |
| `--cheapest` | Show only cheapest per date pair | false |

### `quick` - Quick search

```bash
travel-cli quick <from>-<to> [date]
```

Date can be:
- `today` (default)
- `tomorrow`
- `YYYY-MM-DD` format

## Common Airport Codes

| City | Code |
|------|------|
| Bengaluru | BLR |
| New Delhi | DEL |
| Mumbai | BOM |
| Chennai | MAA |
| Kolkata | CCU |
| Hyderabad | HYD |
| San Francisco | SFO |
| New York JFK | JFK |
| London Heathrow | LHR |
| Dubai | DXB |
| Singapore | SIN |
| Jammu | IXJ |

## How It Works

This CLI uses the [Google Flights MCP Server](https://github.com/nicholasareed/google-flights-mcp) to fetch flight data. The MCP (Model Context Protocol) enables standardized communication between the CLI and the flight search service.

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  travel-cli │────▶│  MCP Protocol   │────▶│  Google Flights  │
│   (Client)  │◀────│  (Transport)    │◀────│   MCP Server     │
└─────────────┘     └─────────────────┘     └──────────────────┘
```

## Running with Docker

```bash
# Build the image
docker build -t travel-cli .

# Run searches
docker run --rm travel-cli search -f BLR -t DEL -d 2025-12-20
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Author

Built with ❤️ for the Docker community by [Ajeet Singh Raina](https://github.com/ajeetraina)

---

**Part of the [Collabnix](https://collabnix.com) community projects**
