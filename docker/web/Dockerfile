# "web" Dockerfile: compiles the latest version of Plotter
FROM ubuntu:14.04
MAINTAINER Jussi Ekholm "jussi@sedaris.fi"

FROM node:0.10.41

# install packages:
RUN apt-get update && apt-get install -y \
    git \
    wget \
    npm \
    subversion \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# Have Chrome for grunt purposes
#RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \ 
# && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list

#RUN apt-get update && apt-get install -y \
# google-chrome-stable \
# && apt-get clean \
# && rm -rf /var/lib/apt/lists/*
#ENV CHROME_BIN /usr/bin/google-chrome

RUN npm -g install grunt-cli karma bower

RUN useradd -m builduser
USER builduser

# Clone Plotter repo: TODO - remove the private token and make repo public!
RUN git clone https://51f231e2cf6432f41bae640e73b4d09da18b13de@github.com/amergin/plotter.git /home/builduser/plotter
WORKDIR /home/builduser/plotter

# Start installing
RUN npm install
RUN bower --config.interactive=false install

COPY karma-unit.tpl.js /home/builduser/plotter/karma/karma-unit.tpl.js
# Compile the project
RUN grunt

# done, minified is now under plotter/bin/
# and non-minified under plotter/build/
VOLUME /home/builduser/plotter/bin
VOLUME /home/builduser/plotter/build