# Travel CLI - Google Flights MCP Client
FROM node:20-slim

LABEL maintainer="Ajeet Singh Raina"
LABEL description="CLI tool for searching flights using Google Flights MCP"

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY src/ ./src/

# Make the CLI executable
RUN chmod +x ./src/index.js

# Create symlink for global access
RUN npm link

# Set entrypoint
ENTRYPOINT ["node", "src/index.js"]

# Default command (show help)
CMD ["--help"]
