#!/bin/bash
set -e
chmod +x ./setup/7zz
./setup/7zz x ./setup/setup.rar -o./setup/build -y
chmod +x ./setup/build/setup.exe