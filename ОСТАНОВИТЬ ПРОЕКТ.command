#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
export PATH="$HOME/.docker/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
docker compose stop
echo 'Проект остановлен. Все обращения и файлы сохранены.'
echo 'Нажмите Enter, чтобы закрыть окно.'
read -r
