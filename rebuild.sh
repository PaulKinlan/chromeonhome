# !/usr/bin/sh

docker stop headless
docker rm headless
docker build -t headless_chrome .
