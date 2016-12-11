# !/usr/bin/sh

docker run -d --net host --name headless headless_chrome
docker logs headless