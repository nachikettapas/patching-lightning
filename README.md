# Lightning-Patcher
Lightning-Patcher is Lightning Network based incentivized network for secured distribution of IoT patch updates. 

## Overview
The project consists of three main components: Vendor, Distributor, and IoT. The process begins when a vendor releases new patch update, uploads the update via its web interface, and notifies both the distributors and IoT devices that there is new patch update available to download. Each one of the distributors now downloads the patch update via WebTorrent, and at the same time the IoT devices are searching for distributor(s) to download the patch update from. An IoT device is allowed to download different pieces from different distributors, and thus, to utilize the WebTorrent peer to peer efficient infrastructure. Lightning-Patcher implements a "pay-per-piece" mechanism, i.e., once a connection between a distributor to an IoT device is made, the IoT device first downloads a piece from a distributor, then the latter sends the IoT device a request for payment (according to Lightning Network protocol), and blocks the IoT from downloading other pieces until he pays for the previous one. The IoT device notifies the vendor that he holds the complete genuine copy of the patch update once all pieces have been downloaded, and  sends the summary of his payments for the pieces.  
## Tech

Lightning-Patcher uses number of open source projects to work properly:
* [Python3](https://www.python.org/) 
* [Node.js](https://nodejs.org/) - evented I/O for the backend
* [Express](https://expressjs.com/) - fast node.js network app framework
* [Socket.io](https://socket.io/) - real-time, bidirectional and event-based communication
* [WebTorrent](https://webtorrent.io/) - streaming torrent client for the web browser and the desktop
* [C-Lightning](https://github.com/ElementsProject/lightning) - a specification compliant Lightning Network implementation in C

## Prerequisites
* Both vendor and distributors run Ubuntu 16.04.1
* IoT run Raspberry Pi 3 Model B or Ubuntu 16.04.1

## Automated Installation
Lightning-Patcher requires many  dependencies and installations. In order to mitigate the installation process we developed automatic deployment bash scripts. The main script that acts as an entry point named deploy.sh, triggered from deployer server. Before running the script there are some mandatory manual configurations and installations.

### Install Bitcoin and Lightning binaries
In the deployer server, run :
```sh
$ sudo apt-get install -y build-essential libtool autotools-dev autoconf libssl-dev libboost-all-dev && sudo add-apt-repository ppa:bitcoin/bitcoin && sudo apt-get update && sudo apt-get -y install bitcoind && mkdir ~/.bitcoin/ && cd ~/.bitcoin/
```
This will install bitcoind, create a directory inside home dir, named .bitcoin. Now inside .bitcoin dir :
* Create a bitcoin.conf file, you may use the one inside patching-lightning/Deployment/bitcoin.conf as a reference.
* Install Lightning binaries, run : 
    ```sh
    $ sudo apt-get update && sudo apt-get install -y automake git libgmp-dev libsqlite3-dev python python3 net-tools zlib1g-dev jq
    $ git clone https://github.com/ElementsProject/lightning.git && cd lightning && ./configure --enable-developer && make && make install
    ```
* Make sure the patching-lightning project location is ~/patching-lightning and run :

    ```sh
    $ cd ~/patching-lightning/ && npm install && cd node_modules/webtorrent/ && sudo rm -r node_modules/ && npm install && cd /home/user/ && export LC_ALL=C && sudo apt install -y python3-pip && cd ~/patching-lightning/Utils/AddressGeneration/ && sudo pip3 install -r requirements.txt
    ```
* Make sure that the bitcoin wallet holds at least 1 testnet BTC, you can use this faucet in order to get funds :
   ```sh
    https://coinfaucet.eu/en/btc-testnet/
    ```
* Add IP addresses of machines to : Deployment/vendor ,Deployment/distributor,  Deployment/iot. The IP addresses are delimited by /n, use Deployment/iot as a reference.
* Edit patching-lightning/Deployment/Deployment_config.json:
    * host - The IP address of the deployment server
    * lightningHubNodeID - Lightning nodeId of the deployment server

 
Now that we have finished the manual part, we can use the deployment script.
### Install And Run Vendor
First, make sure that vendor's IP address is defined both in patching-lightning/Deployment/Deployment_config.json and in patching-lightning/Deployment/vendor. Then, install vendor's neccesary dependencies :
```sh
$ ./deploy.sh --new --vendor
```
Now, run vendor application :
```sh
$ ./deploy.sh --run --vendor
```

### Install And Run Disributor(s)
First, make sure that all the distributors' IP addresses defined in patching-lightning/Deployment/distributor. Then, install distributor's neccesary dependencies :
```sh
$ ./deploy.sh --new --distributor
```
Now, run distributor's application :
```sh
$ ./deploy.sh --run --distributor
```

### Install And Run IoT(s)
First, make sure that all the IoTs' IP addresses defined in patching-lightning/Deployment/iot. Then, install IoT's neccesary dependencies :
```sh
$ ./deploy.sh --new --iot
```
Now, run iot's application :
```sh
$ ./deploy.sh --run --iot
```

### Upload Patch Update
Now, that everything is set, go to http://vendor_ip:vendor_port. Here, you can upload your desired patch update file, and watch its live distribution. 


### Deployment Script Subcommands
**[ --new ]** - Used for first installation, installs all project dependencies, generates the Lightning-Patcher config files. Modes of operation supported :
* **[ --branch ]** - specifies the branch of patching-lightning repository, default: develop.
* **[ --iot | --distributor | --vendor ]** - specifies which IP addresses to include 
* Example : cd ~/patching-lightning/Deployment/ && ./deploy.sh --new --branch=master --iot


**[ --pull ]** - Pulls the latest version of the current branch from the repository. Modes of operation supported:
* **[ --iot | --distributor | --vendor ]** - specifies which IP addresses to include 
* Example : cd ~/patching-lightning/Deployment/ && ./deploy.sh --pull --distributor


**[ --npmInstall ]** - Installs Node.js dependencies, useful only in case of any code changes and dependencies added to package.json after running the --new command. Modes of operation supported:
* **[ --iot | --distributor | --vendor ]** - specifies which IP addresses to include 
* Example : cd ~/patching-lightning/Deployment/ && ./deploy.sh --npmInstall --vendor


 **[ --run ]** - Runs the Lightning-Patcher application. Modes of operation supported:
* **[ --all | --iot | --distributor | --vendor ]** - specifies which IP addresses to include 
* Example : cd ~/patching-lightning/Deployment/ && ./deploy.sh --run --all


 **[ --kill ]** - Kills the Lightning-Patcher application. Modes of operation supported:
* **[ --iot | --distributor | --vendor ]** - specifies which IP addresses to include
* Example : cd ~/patching-lightning/Deployment/ && ./deploy.sh --kill --iot


 **[ --create-iot-wallets ]** - Creates new funded wallets for IoT devices. 
* Example : cd ~/patching-lightning/Deployment/ && ./deploy.sh --create-iot-wallets













