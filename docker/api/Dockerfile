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
#RUN pip install --upgrade virtualenv

# Clone Plotter repo: TODO - remove the private token and make repo public!
RUN git clone https://51f231e2cf6432f41bae640e73b4d09da18b13de@github.com/amergin/plotter.git /plotter
RUN mv /plotter/python-api /api
WORKDIR /api

RUN pip install -r requirements.txt
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
RUN mkdir /var/log/api
VOLUME /var/log/api
EXPOSE 8080

# start supervisord which in turn starts the API
CMD ["/usr/bin/supervisord"]