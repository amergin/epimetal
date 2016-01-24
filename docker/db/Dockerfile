# Base Dockerfile for the Plotter web application
FROM ubuntu:14.04
MAINTAINER Jussi Ekholm "jussi@sedaris.fi"

FROM mongo:latest

RUN which mongod
RUN ls -lah /data

FROM plotter-repo

RUN apt-get update && apt-get install -y \
    python-pip \
    python-dev \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# This script expects 'samples.tsv' to be present in the same directory as Dockerfile.
# The tsv file is then used to populate the database.
RUN mkdir /load
COPY samples.tsv /load/samples.tsv

WORKDIR /plotter/python-api

RUN ls -lah .

# Install python packages
RUN pip install -r requirements.txt

RUN ls -lah /data/db

# Load the database
#RUN python load_dataset.py /load/samples.tsv setup.config