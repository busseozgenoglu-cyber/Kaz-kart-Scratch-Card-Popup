# ScratchCart — Railway / herhangi bir container platformu için üretim imajı.
FROM node:20-alpine

EXPOSE 3000
WORKDIR /app

# OpenSSL, Prisma engine'inin Alpine üzerinde çalışması için gerekir.
RUN apk add --no-cache openssl

# Bağımlılıklar önce kopyalanır; kaynak kod değişince katman önbelleği korunur.
COPY package.json package-lock.json* ./

# ÖNEMLİ: build sırasında devDependencies (vite, typescript) gereklidir.
# Bu yüzden önce TÜM bağımlılıklar kurulur, build alınır, sonra budanır.
RUN npm ci

COPY . .

RUN npx prisma generate && npm run build

# Build bittikten sonra çalışma zamanında gereksiz paketleri at (imaj boyutu).
RUN npm prune --omit=dev && npm cache clean --force

ENV NODE_ENV=production
ENV PORT=3000

# start = prisma migrate deploy && remix-serve
CMD ["npm", "run", "start"]
