#!/bin/sh
set -e

# APP_KEY 미지정 시 1회 생성 (재기동마다 바뀌지 않도록 경고)
if [ -z "$APP_KEY" ]; then
  echo "[entrypoint] APP_KEY 미설정 → 임시 키 생성. 운영에서는 .env/compose에 고정 권장."
  export APP_KEY="base64:$(head -c 32 /dev/urandom | base64)"
fi

# 캐시 정리(이전 빌드 캐시가 남아있을 수 있음). 무상태 프록시라 config 캐시만.
php artisan config:clear >/dev/null 2>&1 || true
php artisan route:cache >/dev/null 2>&1 || true

exec "$@"
