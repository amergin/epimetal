# Base Dockerfile for the Plotter web application
FROM mongo:latest
MAINTAINER Jussi Ekholm "jussi@sedaris.fi"

WORKDIR /plotter/python-api

# Install python packages
RUN pip install -r requirements.txt

# Load the database
#RUN python load_dataset.py /load/samples.tsv setup.config