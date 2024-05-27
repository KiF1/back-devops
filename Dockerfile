# Usando a imagem node:lts-slim que inclui OpenSSL
FROM node:lts-slim

# Atualizar o sistema e instalar o OpenSSL e Zabbix Agent
RUN apt-get update -y && apt-get install -y openssl zabbix-agent

# Definindo o diretório de trabalho
WORKDIR /node

# Copiando package.json e package-lock.json antes de instalar as dependências
COPY package*.json ./

# Instalando dependências
RUN npm install

# Instalando TypeScript e tsx globalmente
RUN npm install -g typescript tsx

# Copiando todos os arquivos do projeto
COPY . .

# Gerando os artefatos do Prisma
RUN npx prisma generate

# Aplicando migrações do Prisma
RUN npx prisma migrate dev

# Compilando o TypeScript para JavaScript
RUN npm run build

# Configuração do Zabbix Agent
RUN sed -i 's/Server=127.0.0.1/Server=zabbix-appliance/' /etc/zabbix/zabbix_agentd.conf

# Expondo a porta do servidor
EXPOSE 3333

# Comando para iniciar a aplicação e o Zabbix Agent
CMD ["sh", "-c", "service zabbix-agent start && npm run start"]
