# Dockerfile for the API of Plotter
FROM ubuntu:14.04
MAINTAINER Jussi Ekholm "jussi@sedaris.fi"
# install packages:
RUN apt-get update && apt-get install -y \
    python-pip \
    python-dev \
    build-essential \
    supervisor \
    git \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*
RUN pip install --upgrade pip


# This script expects 'samples.tsv' to be present in the same directory as Dockerfile.
# The tsv file is used to populate the database during startup
RUN mkdir /load
ADD api-docker/samples.tsv /load/samples.tsv

ADD . /api
WORKDIR /api

RUN pip install -r requirements.txt

ADD api-docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

RUN mkdir -p /var/log/api
VOLUME /var/log/api

ADD api-docker/run.sh /run.sh
RUN chmod +x /run.sh

EXPOSE 8080