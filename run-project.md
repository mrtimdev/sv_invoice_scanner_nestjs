docker build -t nest-scanner-app .


docker run -d -p 3000:3000 --name nest-scanner-container nest-scanner-app

Verify It’s Running
docker logs -f nest-scanner-container


docker compose down --remove-orphans

docker-compose up --build



# ------------ PRODUCTION STAGE ------------
FROM node:22-alpine AS production

WORKDIR /app

# Set NODE_ENV to production to avoid running dev-only postinstall scripts
ENV NODE_ENV=production

# Copy package files only
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy built app and static assets from development stage
COPY --from=development /app/dist ./dist
COPY --from=development /app/uploads ./uploads
COPY --from=development /app/public ./public
COPY --from=development /app/package.json ./package.json

EXPOSE 3000

CMD ["node", "dist/main"]