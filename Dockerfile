# Usa o sistema Alpine (Super leve, sobra memória pro instalador)
FROM node:20-alpine

# Cria a pasta
WORKDIR /usr/src/app

# Copia o arquivo de receitas
COPY package.json ./

# 👇 A SOLUÇÃO DO ERRO:
# Instalação limpa, sem auditoria, sem fundos, apenas produção.
# Isso gasta o mínimo de memória possível.
RUN npm install --only=production --no-audit --no-fund

# Copia o resto do bot
COPY . .

# Inicia o bot
CMD ["node", "index.js"]