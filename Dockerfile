FROM node:20-slim

# Cria a pasta do bot
WORKDIR /usr/src/app

# 👇 AQUI ESTÁ O TRUQUE:
# Copia APENAS o arquivo de ingredientes novo.
# Ignora o package-lock.json antigo para não dar conflito.
COPY package.json ./

# Instala tudo do zero (gera um arquivo de trava novo e limpo)
RUN npm install

# Copia o resto do código do bot
COPY . .

# Inicia o bot
CMD ["node", "index.js"]