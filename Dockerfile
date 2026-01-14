FROM node:20-slim

# Define a pasta de trabalho
WORKDIR /usr/src/app

# Copia apenas o package.json (ignora o lock antigo do npm)
COPY package.json ./

# 👇 A MÁGICA: Usamos YARN em vez de NPM
# O Yarn é mais estável e cria seu próprio arquivo de trava limpo
RUN yarn install --production

# Copia o restante dos arquivos do bot
COPY . .

# Inicia o bot
CMD ["node", "index.js"]