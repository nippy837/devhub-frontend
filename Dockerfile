# 第一阶段：使用 Node.js 安装依赖并打包前端
FROM node:24-alpine AS build

# 设置容器内的工作目录，后面的命令都在这里执行
WORKDIR /app

# 先复制依赖清单；依赖没变时，Docker 可以复用安装缓存
COPY package.json package-lock.json ./

# 按 package-lock.json 中锁定的版本安装依赖
RUN npm ci

# 将前端代码复制到容器，并构建出 dist 文件夹
COPY . .
RUN npm test && npm run build

# 第二阶段：使用 Nginx 提供网页访问
FROM nginx:stable-alpine
RUN apk add --no-cache nodejs
COPY server/ /opt/devhub-speed/
CMD ["node", "/opt/devhub-speed/start.mjs"]

# 用我们的配置替换 Nginx 默认的网站配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 只取第一阶段生成的网页文件，放入 Nginx 的网站目录
COPY --from=build /app/dist /usr/share/nginx/html

# 声明容器提供服务的端口；运行时还需要映射到服务器端口
EXPOSE 80