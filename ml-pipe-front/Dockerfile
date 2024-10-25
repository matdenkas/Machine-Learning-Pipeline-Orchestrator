# Stage 1: Build React App
FROM node:16 AS build

# Set working directory
WORKDIR /app

# Copy only the package files for optimized caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app's source code
COPY ./src ./src
COPY ./public ./public

# Build the React app
RUN npm run build

# Stage 2: Serve the React App using Nginx
FROM nginx:alpine

# Copy build files to Nginx's HTML directory
COPY --from=build /app/build /usr/share/nginx/html

# Expose the port Nginx is using
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
