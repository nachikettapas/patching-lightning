#!/bin/bash

cd ~/patching-lightning/ && rm -rf npmLog.log && npm install && cd node_modules/webtorrent/ && sudo rm -rf node_modules/ && npm install