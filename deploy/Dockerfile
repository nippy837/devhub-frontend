# 使用 Nginx 提供网页，服务器可以复用已有镜像层
FROM nginx:stable-alpine

# 网页文件会由 GitHub 提前构建并上传
COPY dist/ /usr/share/nginx/html/

# 使用项目中的接口转发配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
