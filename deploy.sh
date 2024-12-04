cd ml-pipe-front
npm install
npm run build
cd ..
docker-compose build
docker-compose up core -d
docker-compose up portainer -d