# Base Dockerfile for the Plotter repo
FROM ubuntu:14.04
MAINTAINER Jussi Ekholm "jussi@sedaris.fi"

# install packages:
RUN apt-get update && apt-get install -y \
    git \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# Clone Plotter repo: TODO - remove the private token and make repo public!
RUN git clone https://51f231e2cf6432f41bae640e73b4d09da18b13de@github.com/amergin/plotter.git /plotter

VOLUME /plotter