# Usa o Alpine (Leve)
FROM node:20-alpine

# Define a pasta
WORKDIR /usr/src/app

# Copia a receita do bolo
COPY package.json ./

# 👇 A SOLUÇÃO:
# 1. Instala ferramentas de construção (Python, Make, G++)
# 2. Instala o Bot
# 3. Remove as ferramentas para não ocupar espaço
RUN apk add --no-cache python3 make g++ && \
    npm install --production --no-audit && \
    apk del python3 make g++

# Copia o código do bot (o .dockerignore vai filtrar o lixo)
COPY . .

# Inicia
CMD ["node", "index.js"]