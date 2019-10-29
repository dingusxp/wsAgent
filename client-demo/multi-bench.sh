cd `dirname $0`

wsServer=127.0.0.1
wsPortBase=8880
serverCount=8

# 10000 个连接，10个房间，每个房间1000人，每个房间每秒100条信息；理论 10w pushQPS
totalRoom=10
clientSpeakInterval=10
benchNum=20
benchBatch=500
for ((i=0; i<benchNum; i++))
do
  benchId=$(expr $i \* $benchBatch)
  echo "benchId #$benchId ..."
  node ./bench.js --wsServer=$wsServer --wsPortBase=$wsPortBase --serverCount=$serverCount --totalRoom=$totalRoom --benchId=$benchId --benchBatch=$benchBatch > /tmp/bench-$benchId.log &
  sleep 10
done