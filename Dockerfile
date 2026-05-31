FROM node:22-alpine
RUN apk add --no-cache postgresql-client
WORKDIR /app

COPY package*.json ./
RUN npm install --prefer-offline --no-audit --no-fund

COPY . .
RUN npx prisma generate
RUN npx next build

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN sed -i 's/\r$//' startup.sh && chmod +x startup.sh
CMD ["sh", "startup.sh"]
