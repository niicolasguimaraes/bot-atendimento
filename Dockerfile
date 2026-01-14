FROM node:20-slim

# Ativa o PNPM
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /usr/src/app

COPY package.json ./

# 👇 A CORREÇÃO FINAL:
# Instala o GIT (que estava faltando) e ferramentas de sistema
RUN apt-get update && apt-get install -y git python3 make g++

# Instala o bot
RUN pnpm install --prod --ignore-scripts

COPY . .

CMD ["node", "index.js"]