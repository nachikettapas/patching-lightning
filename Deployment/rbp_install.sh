#!/bin/bash

cd ~
echo "start install nodejs"
sudo apt-get update && sudo apt install -y curl
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash - && sudo apt-get install -y nodejs

echo "start install bitcoind"
echo "start update..."
sudo apt update
echo "end update"
echo "start upgrade..."
sudo apt -y upgrade
echo "end upgrade..."
echo "start install dependency..."
sudo apt install -y git build-essential libtool autotools-dev automake pkg-config libssl-dev libevent-dev bsdmainutils libboost-system-dev libboost-filesystem-dev libboost-chrono-dev libboost-program-options-dev libboost-test-dev libboost-thread-dev libminiupnpc-dev libzmq3-dev jq
echo "end install dependency..."
cd bitcoin/
echo "start bitcoin make install..."
sudo make install
echo "end of bitcoin make install"
mkdir ~/.bitcoin
cd ~
echo "start install dependency for lightning"
sudo apt-get install -y autoconf automake build-essential git libtool libgmp-dev libsqlite3-dev python python3 net-tools zlib1g-dev jq
cd ~

echo "Start clone and install lightning.."
git clone https://github.com/ElementsProject/lightning.git && cd $HOME/lightning/ && ./configure --enable-developer && make && sudo make install
echo "End clone lightning.."
cd ~

echo "Start install node patching-lightning packages"
cd ~/patching-lightning/ && npm install && cd node_modules/webtorrent/ && sudo rm -r node_modules/ && npm install && cp ~/patching-lightning/Deployment/bitcoin.conf ~/.bitcoin/
echo "End install node packeges"

#ssh

echo "Start lightning"
~/lightning/lightningd/lightningd --network=testnet --log-level=debug --daemon

cd ~/patching-lightning/Deployment/ ; node Setup.js --type=iot>> $HOME/setupLog.log 2>&1 &
echo "Completed"
sleep 5
