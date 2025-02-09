#!/bin/bash
docker build . -t msb-bot --platform="linux/amd64" &&
docker tag msb-bot falkkuehnel/msb-bot:latest &&
docker push falkkuehnel/msb-bot:latest