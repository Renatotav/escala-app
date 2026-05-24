FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npx next build

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD sh -c "npx prisma db push && npx next start -p 3000"
