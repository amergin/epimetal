# "web" Dockerfile: compiles the latest version of Plotter
FROM ubuntu:14.04
MAINTAINER Jussi Ekholm "jussi@sedaris.fi"

# install packages:
RUN apt-get update && apt-get install -y \
    git \
    wget \
    curl \
    nginx \
    subversion 

# install node
RUN curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -
RUN apt-get install -y nodejs

#clean up
RUN apt-get clean \
 && rm -rf /var/lib/apt/lists/*


RUN npm -g install grunt-cli karma bower

ADD . /plotter
WORKDIR /plotter
RUN rm -rf node_modules/

# Start installing
RUN npm install
RUN bower --config.interactive=false install --allow-root

ADD web-docker/karma-unit.tpl.js karma/karma-unit.tpl.js

# Switch to "grunt" to have the minified version (takes a lot longer)
RUN grunt build

# Add Nginx configuration
ADD python-api/http-docker/nginx.conf /etc/nginx/nginx.conf
RUN chown -R www-data:www-data /var/lib/nginx
RUN chown -R www-data:www-data /plotter

EXPOSE 80 443
