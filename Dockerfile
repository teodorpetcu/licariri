# Use official Node.js image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY app/package*.json ./
RUN npm install

# Copy app code
COPY app/ ./

# Expose port your app listens on
EXPOSE 8000

# Run the app
CMD ["node", "server.js"]
