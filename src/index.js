#!/usr/bin/env node

import { Command } from 'commander';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';

const program = new Command();

// MCP Client singleton
let mcpClient = null;

async function initMCPClient() {
  if (mcpClient) return mcpClient;

  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@nicholasareed/google-flights-mcp@latest'],
  });

  mcpClient = new Client({
    name: 'travel-cli',
    version: '1.0.0',
  }, {
    capabilities: {}
  });

  await mcpClient.connect(transport);
  return mcpClient;
}

async function callMCPTool(toolName, args) {
  const client = await initMCPClient();
  const result = await client.callTool({
    name: toolName,
    arguments: args,
  });
  return JSON.parse(result.content[0].text);
}

function formatPrice(price) {
  if (!price || price === 'Price unavailable') {
    return chalk.gray('N/A');
  }
  return chalk.green(price);
}

function formatDuration(duration) {
  return chalk.cyan(duration);
}

function formatStops(stops) {
  if (stops === 0) return chalk.green('Non-stop');
  if (stops === 1) return chalk.yellow('1 stop');
  return chalk.red(`${stops} stops`);
}

function displayFlightsTable(flights, options = {}) {
  const { showAll = false, sortBy = 'price', limit = 10 } = options;

  let filteredFlights = [...flights];

  // Remove duplicates based on departure time and airline
  const seen = new Set();
  filteredFlights = filteredFlights.filter(f => {
    const key = `${f.name}-${f.departure}-${f.arrival}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort flights
  if (sortBy === 'duration') {
    filteredFlights.sort((a, b) => {
      const getDurationMinutes = (d) => {
        const match = d.match(/(\d+)\s*hr\s*(\d+)?\s*min?/);
        if (!match) return Infinity;
        return (parseInt(match[1]) * 60) + (parseInt(match[2]) || 0);
      };
      return getDurationMinutes(a.duration) - getDurationMinutes(b.duration);
    });
  } else if (sortBy === 'price') {
    filteredFlights.sort((a, b) => {
      const getPrice = (p) => {
        if (!p || p === 'Price unavailable') return Infinity;
        const match = p.match(/[\d,]+/);
        return match ? parseInt(match[0].replace(/,/g, '')) : Infinity;
      };
      return getPrice(a.price) - getPrice(b.price);
    });
  }

  // Limit results
  if (!showAll && filteredFlights.length > limit) {
    filteredFlights = filteredFlights.slice(0, limit);
  }

  const table = new Table({
    head: [
      chalk.bold('Airline'),
      chalk.bold('Departure'),
      chalk.bold('Arrival'),
      chalk.bold('Duration'),
      chalk.bold('Stops'),
      chalk.bold('Price'),
    ],
    style: {
      head: [],
      border: [],
    },
  });

  filteredFlights.forEach((flight) => {
    table.push([
      chalk.white(flight.name),
      flight.departure,
      flight.arrival + (flight.arrival_time_ahead ? chalk.red(` ${flight.arrival_time_ahead}`) : ''),
      formatDuration(flight.duration),
      formatStops(flight.stops),
      formatPrice(flight.price),
    ]);
  });

  console.log(table.toString());
  
  if (!showAll && flights.length > limit) {
    console.log(chalk.gray(`\nShowing ${limit} of ${flights.length} flights. Use --all to see all results.`));
  }
}

function displaySummary(flights) {
  const validPrices = flights
    .map(f => f.price)
    .filter(p => p && p !== 'Price unavailable')
    .map(p => parseInt(p.match(/[\d,]+/)?.[0]?.replace(/,/g, '') || '0'))
    .filter(p => p > 0);

  const durations = flights
    .map(f => {
      const match = f.duration.match(/(\d+)\s*hr\s*(\d+)?\s*min?/);
      if (!match) return null;
      return (parseInt(match[1]) * 60) + (parseInt(match[2]) || 0);
    })
    .filter(d => d !== null);

  const nonStopCount = flights.filter(f => f.stops === 0).length;

  console.log('\n' + chalk.bold.underline('Summary'));
  console.log(`  Total flights found: ${chalk.cyan(flights.length)}`);
  console.log(`  Non-stop flights: ${chalk.green(nonStopCount)}`);
  
  if (validPrices.length > 0) {
    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);
    console.log(`  Price range: ${chalk.green('₹' + minPrice.toLocaleString())} - ${chalk.yellow('₹' + maxPrice.toLocaleString())}`);
  }

  if (durations.length > 0) {
    const minDuration = Math.min(...durations);
    const hours = Math.floor(minDuration / 60);
    const mins = minDuration % 60;
    console.log(`  Fastest flight: ${chalk.cyan(`${hours}h ${mins}m`)}`);
  }
}

// Search command - one-way flights
program
  .command('search')
  .description('Search for one-way flights')
  .requiredOption('-f, --from <code>', 'Origin airport code (e.g., BLR)')
  .requiredOption('-t, --to <code>', 'Destination airport code (e.g., SFO)')
  .requiredOption('-d, --date <date>', 'Travel date (YYYY-MM-DD)')
  .option('-p, --passengers <number>', 'Number of passengers', '1')
  .option('-c, --class <type>', 'Seat class (economy/business)', 'economy')
  .option('-s, --sort <by>', 'Sort by (price/duration)', 'price')
  .option('--fastest', 'Show only the fastest flight')
  .option('--cheapest', 'Show only the cheapest flight')
  .option('-a, --all', 'Show all flights')
  .option('-l, --limit <number>', 'Number of results to show', '10')
  .action(async (options) => {
    const spinner = ora(`Searching flights from ${options.from} to ${options.to}...`).start();

    try {
      const result = await callMCPTool('get_flights_on_date', {
        origin: options.from.toUpperCase(),
        destination: options.to.toUpperCase(),
        date: options.date,
        adults: parseInt(options.passengers),
        seat_type: options.class,
        return_cheapest_only: options.cheapest || false,
      });

      spinner.succeed(`Found ${result.flights.length} flights\n`);

      console.log(chalk.bold(`✈️  Flights from ${chalk.cyan(options.from.toUpperCase())} to ${chalk.cyan(options.to.toUpperCase())} on ${chalk.yellow(options.date)}\n`));

      if (options.fastest) {
        // Sort by duration and show top result
        const sorted = [...result.flights].sort((a, b) => {
          const getDuration = (d) => {
            const match = d.match(/(\d+)\s*hr\s*(\d+)?\s*min?/);
            return match ? (parseInt(match[1]) * 60) + (parseInt(match[2]) || 0) : Infinity;
          };
          return getDuration(a.duration) - getDuration(b.duration);
        });
        displayFlightsTable([sorted[0]], { showAll: true });
      } else {
        displayFlightsTable(result.flights, {
          showAll: options.all,
          sortBy: options.sort,
          limit: parseInt(options.limit),
        });
      }

      displaySummary(result.flights);

    } catch (error) {
      spinner.fail('Failed to search flights');
      console.error(chalk.red(error.message));
      process.exit(1);
    }

    process.exit(0);
  });

// Round-trip command
program
  .command('roundtrip')
  .description('Search for round-trip flights')
  .requiredOption('-f, --from <code>', 'Origin airport code (e.g., BLR)')
  .requiredOption('-t, --to <code>', 'Destination airport code (e.g., SFO)')
  .requiredOption('-d, --depart <date>', 'Departure date (YYYY-MM-DD)')
  .requiredOption('-r, --return <date>', 'Return date (YYYY-MM-DD)')
  .option('-p, --passengers <number>', 'Number of passengers', '1')
  .option('-c, --class <type>', 'Seat class (economy/business)', 'economy')
  .option('-s, --sort <by>', 'Sort by (price/duration)', 'price')
  .option('--cheapest', 'Show only the cheapest option')
  .option('-a, --all', 'Show all flights')
  .option('-l, --limit <number>', 'Number of results to show', '10')
  .action(async (options) => {
    const spinner = ora(`Searching round-trip flights...`).start();

    try {
      const result = await callMCPTool('get_round_trip_flights', {
        origin: options.from.toUpperCase(),
        destination: options.to.toUpperCase(),
        departure_date: options.depart,
        return_date: options.return,
        adults: parseInt(options.passengers),
        seat_type: options.class,
        return_cheapest_only: options.cheapest || false,
      });

      spinner.succeed(`Found ${result.flights.length} round-trip options\n`);

      console.log(chalk.bold(`✈️  Round-trip: ${chalk.cyan(options.from.toUpperCase())} ↔ ${chalk.cyan(options.to.toUpperCase())}`));
      console.log(chalk.gray(`   Depart: ${options.depart} | Return: ${options.return}\n`));

      displayFlightsTable(result.flights, {
        showAll: options.all,
        sortBy: options.sort,
        limit: parseInt(options.limit),
      });

      displaySummary(result.flights);

    } catch (error) {
      spinner.fail('Failed to search flights');
      console.error(chalk.red(error.message));
      process.exit(1);
    }

    process.exit(0);
  });

// Compare command - find flights across date range
program
  .command('compare')
  .description('Compare flights across a date range')
  .requiredOption('-f, --from <code>', 'Origin airport code')
  .requiredOption('-t, --to <code>', 'Destination airport code')
  .requiredOption('--start <date>', 'Start date of range (YYYY-MM-DD)')
  .requiredOption('--end <date>', 'End date of range (YYYY-MM-DD)')
  .option('--min-stay <days>', 'Minimum stay duration in days')
  .option('--max-stay <days>', 'Maximum stay duration in days')
  .option('-p, --passengers <number>', 'Number of passengers', '1')
  .option('-c, --class <type>', 'Seat class (economy/business)', 'economy')
  .option('--cheapest', 'Show only cheapest for each date pair')
  .action(async (options) => {
    const spinner = ora(`Searching flights across date range...`).start();

    try {
      const args = {
        origin: options.from.toUpperCase(),
        destination: options.to.toUpperCase(),
        start_date_str: options.start,
        end_date_str: options.end,
        adults: parseInt(options.passengers),
        seat_type: options.class,
        return_cheapest_only: options.cheapest || false,
      };

      if (options.minStay) args.min_stay_days = parseInt(options.minStay);
      if (options.maxStay) args.max_stay_days = parseInt(options.maxStay);

      const result = await callMCPTool('find_all_flights_in_range', args);

      spinner.succeed(`Found ${result.flights.length} flight options\n`);

      console.log(chalk.bold(`✈️  Flights: ${chalk.cyan(options.from.toUpperCase())} → ${chalk.cyan(options.to.toUpperCase())}`));
      console.log(chalk.gray(`   Date range: ${options.start} to ${options.end}\n`));

      displayFlightsTable(result.flights, {
        showAll: true,
        sortBy: 'price',
      });

      displaySummary(result.flights);

    } catch (error) {
      spinner.fail('Failed to search flights');
      console.error(chalk.red(error.message));
      process.exit(1);
    }

    process.exit(0);
  });

// Quick command for common routes
program
  .command('quick <route>')
  .description('Quick search for common routes (e.g., "blr-del tomorrow")')
  .action(async (route) => {
    const parts = route.toLowerCase().split(/[\s-]+/);
    
    if (parts.length < 2) {
      console.error(chalk.red('Usage: travel-cli quick <from>-<to> [date]'));
      console.error(chalk.gray('Example: travel-cli quick blr-del tomorrow'));
      process.exit(1);
    }

    const from = parts[0].toUpperCase();
    const to = parts[1].toUpperCase();
    
    // Parse date
    let date;
    const dateStr = parts[2] || 'today';
    const today = new Date();
    
    if (dateStr === 'today') {
      date = today.toISOString().split('T')[0];
    } else if (dateStr === 'tomorrow') {
      today.setDate(today.getDate() + 1);
      date = today.toISOString().split('T')[0];
    } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      date = dateStr;
    } else {
      console.error(chalk.red('Invalid date. Use YYYY-MM-DD format or "today"/"tomorrow"'));
      process.exit(1);
    }

    const spinner = ora(`Quick search: ${from} → ${to} on ${date}...`).start();

    try {
      const result = await callMCPTool('get_flights_on_date', {
        origin: from,
        destination: to,
        date: date,
        adults: 1,
        seat_type: 'economy',
        return_cheapest_only: false,
      });

      spinner.succeed(`Found ${result.flights.length} flights\n`);

      console.log(chalk.bold(`✈️  ${chalk.cyan(from)} → ${chalk.cyan(to)} on ${chalk.yellow(date)}\n`));

      displayFlightsTable(result.flights, {
        showAll: false,
        sortBy: 'price',
        limit: 5,
      });

      displaySummary(result.flights);

    } catch (error) {
      spinner.fail('Failed to search flights');
      console.error(chalk.red(error.message));
      process.exit(1);
    }

    process.exit(0);
  });

program
  .name('travel-cli')
  .description('CLI tool for searching flights using Google Flights MCP')
  .version('1.0.0');

program.parse();
