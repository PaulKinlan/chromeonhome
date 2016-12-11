# Base docker image
FROM ubuntu:16.04
MAINTAINER Paul Kinlan <paulkinlan@google.com>
# MAINTAINER Justin Ribeiro <justin@justinribeiro.com>

# Experimental! 
#
# To run:
# docker run -d --net host --name headless headless_chrome
# 
# Access:
# http://localhost:9222/

# Pull my chrome-headless build
ADD chrome-headless.deb /src/chrome-headless.deb

# Setup deps, install chrome-headless
RUN apt-get update && apt-get install -y \
  build-essential \
  software-properties-common \
  ca-certificates \
  byobu curl git htop man unzip vim wget \
  sudo \
  gconf-service \
  libcurl3 \
  libexif-dev \
  libgconf-2-4 \
  libglib2.0-0 \ 
  libgl1-mesa-dri \
  libgl1-mesa-glx \
  libnspr4 \
  libnss3 \
  libpango1.0-0 \
  libv4l-0 \
  libxss1 \
  libxtst6 \
  libxrender1 \ 
  libx11-6 \ 
  libxft2 \ 
  libfreetype6 \ 
  libc6 \ 
  zlib1g \ 
  libpng12-0 \
  wget \
  apt-utils \
  xdg-utils \
  --no-install-recommends && \
  dpkg -i '/src/chrome-headless.deb' && \
  curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash - && \
  sudo apt-get install -y nodejs && \
  sudo apt-get install -y libnss3 && \
  rm -rf /var/lib/apt/lists/*


COPY ./node_modules /opt/stickmanventures/node_modules
ADD ./index.js /opt/stickmanventures/index.js
ADD ./package.json /opt/stickmanventures/package.json

WORKDIR /opt/stickmanventures/

# expose 8080 so we can connect to it
EXPOSE 8080

CMD ["node", "index.js", "/opt/stickmanventures/chrome-headless/headless_shell" ]