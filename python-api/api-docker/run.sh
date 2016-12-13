#!/bin/sh

LOAD_SCRIPT=/api/load_dataset.py
CONFIG=/api/setup.json
FLUSH_SCRIPT=/api/flush_database.py
WORK_DIR=/api
SAMPLES=/load/samples.tsv
SUPERVISORD=/usr/bin/supervisord

PIDFILE=/var/run/api.pid

load() {
  echo 'Loading samples…' >&2
  cd $WORK_DIR
  if python $LOAD_SCRIPT $SAMPLES; then
    echo 'Samples loaded.' >&2
  else
    echo 'Loading samples FAILED, aborting.'
    exit
  fi
}

flush() {
  echo 'Removing all entries from database!' >&2
  python $FLUSH_SCRIPT $CONFIG --yes
  echo 'Removal complete.' >&2
}

start() {
  if [ -f /var/run/$PIDNAME ] && kill -0 $(cat /var/run/$PIDNAME); then
    echo 'Service already running' >&2
    return 1
  fi
  echo 'Starting service…' >&2
  supervisord
  echo 'Service started' >&2
}

stop() {
  if [ ! -f "$PIDFILE" ] || ! kill -0 $(cat "$PIDFILE"); then
    echo 'Service not running' >&2
    return 1
  fi
  echo 'Stopping service…' >&2
  kill -s SIGQUIT $(cat "$PIDFILE")
  rm -f "$PIDFILE"
  echo 'Service stopped' >&2
}

case "$1" in
  load)
    flush
    load
    start
    ;;
  start)
    start
    ;;
  flush)
    flush
    ;;
  stop)
    stop
    ;;
  restart)
    stop
    start
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|load|flush}"
esac