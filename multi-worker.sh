
# just a demo, please modify to match your demand

cd `dirname $0`

basePort=8880
workerNum=8
for ((i=0; i<workerNum; i++))
do
  port=$(expr $basePort + $i)
  echo "server-$port ..."
  node ./server.js --serverPort=$port > /tmp/server-$port.log & 
  sleep 1
done
