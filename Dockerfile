# Volta para o sistema padrão (mais compatível e não precisa compilar tudo)
FROM node:20-slim

# Define a pasta
WORKDIR /usr/src/app

# Copia apenas o arquivo de receitas
COPY package.json ./

# 👇 O SEGREDO:
# --omit=dev: Não baixa ferramentas de desenvolvimento
# --no-optional: Pula dependências opcionais pesadas que travam a memória
# --no-audit: Não perde tempo verificando segurança agora
RUN npm install --omit=dev --no-optional --no-audit

# Copia o resto do código (filtrado pelo .dockerignore)
COPY . .

# Inicia o bot
CMD ["node", "index.js"]