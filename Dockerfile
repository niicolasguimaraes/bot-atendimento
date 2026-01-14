FROM node:20-slim

# Cria a pasta do bot
WORKDIR /usr/src/app

# Copia os arquivos de configuração
COPY package*.json ./

# Instala apenas o necessário (Baileys)
RUN npm install

# Copia o resto do código
COPY . .

# Inicia o bot
CMD ["node", "index.js"]