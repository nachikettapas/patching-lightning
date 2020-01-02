#!/bin/bash

# TO DO
# in order to be able to copy files without entering password
# generate key pairs on the host (deployment server) - already done on 10.0.0.36 in case it will be used as a deployment server:
# ssh-keygen -t rsa -b 2048
# Generating public/private rsa key pair.
# Enter file in which to save the key (/root/.ssh/id_rsa): # Hit Enter
# Enter passphrase (empty for no passphrase): # Hit Enter
# Enter same passphrase again: # Hit Enter
# Your identification has been saved in /root/.ssh/id_rsa.
# Your public key has been saved in /root/.ssh/id_rsa.pub.
#
# Then copy the public key to the target server
# ssh-copy-id user@server (e.g. user@10.0.1.2)

USER="pi"
SERVERUSER="alexey"
BRANCH="develop"
LIGHTNINGDIRECTORY="~/patching-lightning/"
CONFIG=""
CONF_IOT="iot"
CONF_DISTRIBUTOR="distributor"
CONF_VENDOR="vendor"
IOT="0"
DISTRIBUTOR="0"
VENDOR="0"
ALL="0"
RUN="0"
PULL="0"
NEW_INSTALL="0"
START="0"
RBP="0"
CHECKOUT=""
STATUS="0"
CREATE_WALLETS="0"
NPM="0"
PKILLLIGHTNING="0"
KILLALL="0"
CLI=""

function init(){
  ip="$(cut -d'|' -f1 <<<"$1")"
  user="$(cut -d'|' -f2 <<<"$1")"
  echo IP: $ip, user: $user
}

function initVendor(){
  line=`head -n 1 'vendor'`
  vendorIP="$(cut -d'|' -f1 <<<"$line")"
  vendorUser="$(cut -d'|' -f2 <<<"$line")"
  echo $vendorIP $vendorUser
}


POSITIONAL=()
while [ "$#" -gt 0 ]; do
  case "$1" in
    --pull) PULL="1"; shift 1;;
    --new) NEW_INSTALL="1"; shift 1;;
    --rbp) RBP="1"; shift 1;;
    --status) STATUS="1"; shift 1;;
    --create-iot-wallets) CREATE_WALLETS="1"; shift 1;;
    --iot) IOT="1"; shift 1;;
    --distributor) DISTRIBUTOR="1"; shift 1;;
    --vendor) VENDOR="1"; shift 1;;
    --all) ALL="1"; shift 1;;
    --run) RUN="1"; shift 1;;
    --npmInstall) NPM="1"; shift 1;;
    --killLightning) PKILLLIGHTNING="1"; shift 1;;
    --killAll) KILLALL="1"; shift 1;;


    --checkout=*) CHECKOUT="${1#*=}"; shift 1;;
    --branch=*) BRANCH="${1#*=}"; shift 1;;
    --config=*) CONFIG="${1#*=}"; shift 1;;
    --cli=*) CLI="${1#*=}"; shift 1;;


    -*) echo "unknown option: $1" >&2; exit 1;;
    *) handle_argument "$1"; shift 1;;
  esac
done

if [ "$IOT" = "1" ]; then
    CONFIG="$CONF_IOT"
elif [ "$DISTRIBUTOR" = "1" ]; then
    CONFIG="$CONF_DISTRIBUTOR"
elif [ "$VENDOR" = "1" ]; then
    CONFIG="$CONF_VENDOR"
fi

if [ "$NEW_INSTALL" = "1" ] && [ "$RBP" = "0" ]; then

    while IFS= read -r line
         do
           echo "start deploy " $line
           init $line
           initVendor
           target="$user@$ip"
           targetVendor="$vendorUser@$vendorIP"
           echo "start install nodejs"
           ssh -n $target "sudo apt-get update && sudo apt install -y curl"
           ssh -n $target "curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash - && sudo apt-get install -y nodejs"
           bitcoinSource="/home/$SERVERUSER/patching-lightning/Deployment/bitcoin.conf"
           bitcoinTarget="$user@$ip:/home/$user/.bitcoin/"
           echo "start install bitcoind"
           ssh -n $target "sudo apt-get install -y build-essential libtool autotools-dev autoconf libssl-dev libboost-all-dev && sudo add-apt-repository ppa:bitcoin/bitcoin && sudo apt-get update && sudo apt-get -y install bitcoind && mkdir ~/.bitcoin/ && cd ~/.bitcoin/"
           echo "start install dependency for lightning"
           ssh -n $target "sudo apt-get update && sudo apt-get install -y automake git libgmp-dev libsqlite3-dev python python3 net-tools zlib1g-dev jq"
           echo "Clone lightning from repository"
           ssh -n $target "git clone https://github.com/ElementsProject/lightning.git && cd lightning && ./configure --enable-developer && make && make install"
           echo "Start clone patching-lightning"
           ssh -n $target "git clone -b $BRANCH https://alexey:aY320988@git.tlabs.bgu.ac.il/IoT/patching-lightning.git && cd patching-lightning/ && git config user.name alexey && git config user.password aY320988"
           echo "Start install packages"
           ssh -n $target "cd ~/patching-lightning/ && npm install && cd node_modules/webtorrent/ && sudo rm -r node_modules/ && npm install && cd /home/$user/ && export LC_ALL=C && sudo apt install -y python3-pip && cd ~/patching-lightning/Utils/AddressGeneration/ && sudo pip3 install -r requirements.txt"
           echo "start copy bitcoind config file"
           scp -r $bitcoinSource $bitcoinTarget
           #get lightning configuration
           if [ "$IOT" = "1" ]; then
               echo "Create IoT config and create new lightning wallet"
               ssh -n $targetVendor "while true ; do if pgrep -x lightningd > /dev/null; then pkill lightning && echo \"lightning process is killed\" && break; else echo \"wait to lightning process\" && sleep 2 ; fi; done && chmod 777 ~/.lightning/hsm_secret && cd ~/.lightning && ssh -n $target \"if [ -e \"/home/$user/.lightning\" ]; then sudo rm -r /home/$user/.lightning ; fi && mkdir .lightning\" && scp hsm_secret $target:~/.lightning/ && pwd && node /home/$vendorUser/patching-lightning/Vendor/generateIoTConfig.js --hsmSecretPath=/home/$vendorUser/.lightning/hsm_secret && scp ~/patching-lightning/Vendor/IoT_config.json $target:~/patching-lightning/IoT/ &&  sudo rm -r ~/.lightning/ && ~/lightning/lightningd/lightningd --network=testnet --log-level=debug --daemon"
               echo "Start lightning"
               ssh -n $target "cd lightning && ~/lightning/lightningd/lightningd --network=testnet --log-level=debug --daemon >> runLog.log 2>&1 &"
               echo "Start lightning channel setup"
               ssh -n $target "cd ~/patching-lightning/Deployment/ ; node Setup.js --type=iot >> setupLog.log 2>&1 &"
           elif [ "$DISTRIBUTOR" = "1" ]; then
               now=$(date)
               ssh -n $target "cd lightning && ~/lightning/lightningd/lightningd --network=testnet --log-level=debug --daemon >> runLog.log 2>&1 &"
               vendorIp_=$(jq '.vendorIp' /home/$SERVERUSER/patching-lightning/Deployment/Deployment_config.json)
               vendorPort=$(jq '.vendorPort' /home/$SERVERUSER/patching-lightning/Deployment/Deployment_config.json)
               lightningHubNodeId=$(jq '.lightningHubNodeID' /home/$SERVERUSER/patching-lightning/Deployment/Deployment_config.json)
               echo "vendor Ip $targetVendor"
               vendorPubKey=$(ssh -n $targetVendor "jq '.publicKey' ~/patching-lightning/Vendor/Vendor_config.json")
               echo "vendorIp=$vendorIp_, vendorPort=$vendorPort, lightningHubNodeId=$lightningHubNodeId, vendorPubKey=$vendorPubKey"
               ssh -n $target "node /home/$user/patching-lightning/Deployment/createConfig.js --type=Distributor --vendorIp=$vendorIp_ --vendorPort=$vendorPort --vendorPubKey=$vendorPubKey --lightningHubNodeId=$lightningHubNodeId"
               invoice=$(~/lightning/cli/lightning-cli invoice 5000000 "$target$now" hello 28800|\jq '.bolt11')
               ssh -n $target "node /home/$user/patching-lightning/Utils/generateAddress.js --hsmSecretPath=/home/$user/.lightning/hsm_secret --configFilePath=/home/$user/patching-lightning/Distributor/Distributor_config.json"
               echo "Start lightning channel setup"
               ssh -n $target "cd ~/patching-lightning/Deployment/ ; node Setup.js --type=distributor --invoice=$invoice >> setupLog.log 2>&1 &"
           elif [ "$VENDOR" = "1" ]; then
               echo "Start lightning channel setup"
               ssh -n $target "node /home/$user/patching-lightning/Deployment/createConfig.js --type=Vendor --vendorPort=8080"
               ssh -n $target "~/lightning/lightningd/lightningd --network=testnet --log-level=debug --daemon && sleep 5 && pkill lightning && node /home/$user/patching-lightning/Utils/generateAddress.js --hsmSecretPath=/home/$user/.lightning/hsm_secret --configFilePath=/home/$user/patching-lightning/Vendor/Vendor_config.json && sudo rm -r ~/.lightning/ && ~/lightning/lightningd/lightningd --network=testnet --log-level=debug --daemon >> runLog.log 2>&1 &"
           fi

           echo "End of installation $ip"
           sleep 5
         done <"$CONFIG"

elif [ "$NEW_INSTALL" = "1" ] && [ "$RBP" = "1" ]; then
    while IFS= read -r line
         do
           echo "start deploy RBP " $line
           init $line
           initVendor
           target="$user@$ip"
           targetVendor="$vendorUser@$vendorIP"
           scp -r ~/patching-lightning_install/bitcoin/ $user@$ip:/home/$user/ #copy bitcoin
           echo "Start clone patching-lightning"
           ssh -n $target "git clone -b $BRANCH https://alexey:aY320988@git.tlabs.bgu.ac.il/IoT/patching-lightning.git && cd ~/patching-lightning/ && git config user.name alexey && git config user.password aY320988"
           echo "Create IoT config and create new lightning wallet"
           ssh -n $targetVendor "while true ; do if pgrep -x lightningd > /dev/null; then pkill lightning && echo \"lightning process is killed\" && break; else echo \"wait to lightning process\" && sleep 2 ; fi; done && chmod 777 ~/.lightning/hsm_secret && cd ~/.lightning && ssh -n $target \"if [ -e \"/home/$user/.lightning\" ]; then sudo rm -r /home/$user/.lightning ; fi && mkdir .lightning\" && scp hsm_secret $target:~/.lightning/  && node /home/$vendorUser/patching-lightning/Vendor/generateIoTConfig.js --hsmSecretPath=/home/$vendorUser/.lightning/hsm_secret && scp ~/patching-lightning/Vendor/IoT_config.json $target:~/patching-lightning/IoT/ &&  sudo rm -r ~/.lightning/ && cd ~ && nohup ~/lightning/lightningd/lightningd --network=testnet --log-level=debug --daemon >> lightningRunLog.log 2 >&1 &"
           echo "Start rbp install"
           ssh -n $target "cd ~/patching-lightning/Deployment/; nohup ./rbp_install.sh > /home/$user/rbp_install_log.log 2>&1 &"
           echo "End of installation $ip"
         done <"$CONF_IOT"


elif [ "$PULL" = "1" ] ; then
    if [ "$ALL" = "1" ]; then
        while IFS= read -r line
             do
               echo "Start IoT git pull " $line
               init $line
               target="$user@$ip"
               ssh -n $target "cd patching-lightning/ && git fetch && git reset --hard origin/$BRANCH"
               echo "End of git pull $ip"
             done <"$CONF_IOT"

        while IFS= read -r line
             do
               echo "Start Vendor git pull " $line
               init $line
               target="$user@$ip"
               ssh -n $target "cd patching-lightning/ && git fetch && git reset --hard origin/$BRANCH"
               echo "End of git pull $ip"
             done <"$CONF_VENDOR"

        while IFS= read -r line
             do
               echo "Start Distributor git pull " $line
               init $line
               target="$user@$ip"
               ssh -n $target "cd patching-lightning/ && git fetch && git reset --hard origin/$BRANCH"
               echo "End of git pull $ip"
             done <"$CONF_DISTRIBUTOR"

    elif [ "$ALL" = "0" ] && [ ! -z "$CONFIG" ] ; then
        while IFS= read -r line
             do
               echo "Start git pull " $line
               init $line
               target="$user@$ip"
               ssh -n $target "cd patching-lightning/ && git fetch && git reset --hard origin/$BRANCH"
               echo "End of git pull $ip"
             done <"$CONFIG"
    fi

elif [ "$NPM" = "1" ] ; then

    if [ "$IOT" = "1" ]; then
        while IFS= read -r line
                 do
                   echo "Start IoT npm install" $line
                   init $line
                   target="$user@$ip"
                   ssh -n $target "nohup ./patching-lightning/Deployment/installIotPackages.sh > npmLog.log 2>&1 &"
                   echo "End of npm install $ip"
                 done <"$CONFIG"


    elif [ "$IOT" = "0" ]; then
        while IFS= read -r line
             do
               echo "Start npm install" $line
               init $line
               target="$user@$ip"
               ssh -n $target "nohup ./patching-lightning/Deployment/installPackages.sh > npmLog.log 2>&1 &"
               echo "End of npm install $ip"
             done <"$CONFIG"

    fi

elif [ "$PKILLLIGHTNING" = "1" ] ; then
    while IFS= read -r line
         do
           echo "Kill lightning" $line
           init $line
           target="$user@$ip"
           ssh -n $target "pkill lightning && pkill node; nohup ~/lightning/lightningd/lightningd --network=testnet --log-level=debug --daemon > runLightningLog.log 2>&1 &"
           echo "Lightning is killed $ip"
         done <"$CONFIG"

elif [ "$KILLALL" = "1" ] ; then
    while IFS= read -r line
         do
           echo "Vendor kill node process" $line
           init $line
           target="$user@$ip"
           ssh -n $target "pkill node"
           echo "Node is killed $ip"
         done <"$CONF_VENDOR"

    while IFS= read -r line
         do
           echo "Distributor kill node process" $line
           init $line
           target="$user@$ip"
           ssh -n $target "pkill node"
           echo "Node is killed $ip"
         done <"$CONF_DISTRIBUTOR"

    while IFS= read -r line
         do
           echo "IoT kill node process" $line
           init $line
           target="$user@$ip"
           ssh -n $target "pkill node"
           echo "Node is killed $ip"
         done <"$CONF_IOT"


elif [ "$RUN" = "1" ]; then
    if [ "$ALL" = "1" ]; then
        while IFS= read -r line
             do
               echo "Run Vendor " $line
               init $line
               target="$user@$ip"
               #Kill node process and start Vendor
               ssh -n $target "pkill node"
               ssh -n $target "cd ~/patching-lightning/Vendor/ && export DEBUG=vendor,bittorrent-protocol ; nohup node index.js > runVendorLog.log 2>&1 &"
             done <"$CONF_VENDOR"

        while IFS= read -r line
             do
               echo "Run Distributor " $line
               init $line
               target="$user@$ip"
               #Check if lightning process is run, if yes then we start the Distributor else start lightning and run the Distributor
               ssh -n $target "pkill node"
               ssh -n $target "pkill lightning"
               ssh -n $target "if pgrep -x lightningd > /dev/null; then cd ~/patching-lightning/Distributor/ && pkill node ; else pkill node ; nohup ~/lightning/lightningd/lightningd --network=testnet --log-level=debug --daemon > runLightningLog.log 2>&1 & fi"
               ssh -n $target "cd /home/$user/patching-lightning/Distributor/ && sleep 2 && export DEBUG=bittorrent-extension,distributor,bittorrent-protocol,LightningClient; nohup node index.js > runDistLog.log 2>&1 &"
             done <"$CONF_DISTRIBUTOR"

        while IFS= read -r line
              do
                echo "Run IoT " $line
               init $line
               target="$user@$ip"
               #Check if lightning process is run, if yes then we start the IoT else start lightning and run the IoT

               ssh -n $target "pkill node"
               ssh -n $target "pkill lightning"
               ssh -n $target "if pgrep -x lightningd > /dev/null; then cd ~/patching-lightning/IoT/ && pkill node ; else nohup ~/lightning/lightningd/lightningd --network=testnet --log-level=debug --daemon > runLightningLog.log 2>&1 & fi"
               ssh -n $target "cd /home/$user/patching-lightning/IoT/ && sleep 2 && export DEBUG=bittorrent-extension,iot,bittorrent-protocol,LightningClient,lightning-client; nohup node index.js > runIotLog.log 2>&1 &"

              done <"$CONF_IOT"

    elif [ "$VENDOR" = "1" ]; then
        while IFS= read -r line
             do
               echo "Run Vendor " $line
               init $line
               target="$user@$ip"
               #Kill node process and start Vendor
               ssh -n $target "pkill node"
               ssh -n $target "cd ~/patching-lightning/Vendor/ && export DEBUG=vendor,bittorrent-protocol ; nohup node index.js > runVendorLog.log 2>&1 &"

             done <"$CONF_VENDOR"

    elif [ "$DISTRIBUTOR" = "1" ]; then
        while IFS= read -r line
             do
               echo "Run Distributor " $line
               init $line
               target="$user@$ip"
               #Check if lightning process is run, if yes then we start the Distributor else start lightning and run the Distributor
               ssh -n $target "pkill node"
               ssh -n $target "pkill lightning"
               ssh -n $target "if pgrep -x lightningd > /dev/null; then cd ~/patching-lightning/Distributor/ && pkill node ; else nohup ~/lightning/lightningd/lightningd --network=testnet --log-level=debug --daemon > runLightningLog.log 2>&1 & fi"
               ssh -n $target "cd /home/$user/patching-lightning/Distributor/ && sleep 2 &&  export DEBUG=bittorrent-extension,distributor,bittorrent-protocol,LightningClient,webt ; nohup node index.js > runDistLog.log 2>&1 &"
             done <"$CONF_DISTRIBUTOR"

    elif [ "$IOT" = "1" ]; then
        while IFS= read -r line
             do
               echo "Run IoT " $line
               init $line
               target="$user@$ip"
               #Check if lightning process is run, if yes then we start the Distributor else start lightning and run the IoT
               ssh -n $target "pkill node"
               ssh -n $target "pkill lightning"
               ssh -n $target "if pgrep -x lightningd > /dev/null; then cd ~/patching-lightning/IoT/ && pkill node ; else nohup ~/lightning/lightningd/lightningd --network=testnet --log-level=debug --daemon > runLightningLog.log 2>&1 & fi"
               ssh -n $target "cd /home/$user/patching-lightning/IoT/ && sleep 2 && export DEBUG=bittorrent-extension,iot,bittorrent-protocol,LightningClient ; nohup node index.js > runIotLog.log 2>&1 &"
             done <"$CONF_IOT"
    fi

elif [ ! -z "$CHECKOUT" ]; then
    while IFS= read -r line
         do
           echo "Start git checkout to $CHECKOUT branch" $line
           init $line
           target="$user@$ip"
           ssh -n $target "cd ~/patching-lightning/ && git fetch && git reset --hard && git checkout $CHECKOUT"
           echo "End of Checkout $ip"
         done <"$CONFIG"

elif [ "$CREATE_WALLETS" = "1" ]; then
    while IFS= read -r line
         do
           echo "Start create wallet in" $line
           init $line
           initVendor
           target="$user@$ip"
           targetVendor="$vendorUser@$vendorIP"
           ssh -n $targetVendor "while true ; do if pgrep -x lightningd > /dev/null; then pkill lightning && echo \"lightning process is killed\" && break; else echo \"wait to lightning process\" && sleep 2 ; fi; done && chmod 777 ~/.lightning/hsm_secret && cd ~/.lightning && ssh -n $target \"if [ -e \"/home/$user/.lightning\" ]; then sudo rm -r /home/$user/.lightning ; fi && mkdir .lightning\" && scp hsm_secret $target:~/.lightning/  && node /home/$vendorUser/patching-lightning/Vendor/generateIoTConfig.js --hsmSecretPath=/home/$vendorUser/.lightning/hsm_secret && scp ~/patching-lightning/Vendor/IoT_config.json $target:~/patching-lightning/IoT/ &&  sudo rm -rf ~/.lightning/ "
           ssh -n $targetVendor "nohup ~/lightning/lightningd/lightningd --network=testnet --log-level=debug --daemon >> lightningRunLog.log 2 >&1 &"

           ssh -n $target "nohup ~/lightning/lightningd/lightningd --network=testnet --log-level=debug --daemon >> lightningRunLog.log 2 >&1 &"
           ssh -n $target "cd ~/patching-lightning/Deployment/ ; node Setup.js --type=iot>> /home/$user/setupLog.log 2>&1 &"
           echo "End of wallet creation $ip"
         done <"$CONF_IOT"

elif [ ! -z "$CLI" ]; then
    while IFS= read -r line
         do
           echo "Start cli in" $line
           init $line
           target="$user@$ip"
           ssh -n $target "$CLI"
           echo "End of cli $CLI $ip"
         done <"$CONFIG"

fi
