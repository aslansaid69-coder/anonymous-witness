#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
export PATH="$HOME/.docker/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
fail() { echo; echo "$1"; echo 'Нажмите Enter, чтобы закрыть окно.'; read -r; exit 1; }
echo 'Anonymous Witness — запуск демонстрации'
command -v docker >/dev/null || fail 'Не найден Docker Desktop. Проект подготовлен для этого Mac.'
if ! docker info >/dev/null 2>&1; then
  open '/Applications/Docker.app' || true
  echo 'Ожидаем запуска Docker Desktop…'
  ready=0
  for i in $(seq 1 90); do
    if docker info >/dev/null 2>&1; then ready=1; break; fi
    sleep 2
  done
  [ "$ready" = 1 ] || fail 'Docker не запустился. Откройте Docker Desktop, дождитесь запуска и повторите.'
fi
[ -f .env ] || fail 'Отсутствует файл .env. Используйте исходную подготовленную папку проекта.'
docker compose up -d --no-build || fail 'Не удалось запустить контейнеры. Не удаляйте образы и тома проекта в Docker Desktop.'
echo 'Ожидаем готовности сайта…'
ready=0
for i in $(seq 1 90); do
  if curl -fsS http://localhost:8080/api/health >/dev/null 2>&1; then ready=1; break; fi
  sleep 2
done
[ "$ready" = 1 ] || fail 'Сайт не ответил. Проверьте контейнеры проекта в Docker Desktop.'
echo 'Готово! Открываем http://localhost:8080'
open 'http://localhost:8080'
echo 'Логины и пароли находятся в файле ДОСТУПЫ.txt рядом с этим файлом.'
echo 'Это окно можно закрыть. Контейнеры продолжат работать.'
