# Usa a versão Slim do Node 20
FROM node:20-slim

# Ativa o PNPM (O instalador que economiza memória)
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Cria a pasta
WORKDIR /usr/src/app

# Copia apenas o arquivo de receita
COPY package.json ./

# 👇 A MÁGICA:
# Usa pnpm install em vez de npm install.
# Isso evita o estouro de memória (Erro 254).
RUN pnpm install --prod --ignore-scripts

# Copia o resto dos arquivos
COPY . .

# Inicia o bot
CMD ["node", "index.js"]