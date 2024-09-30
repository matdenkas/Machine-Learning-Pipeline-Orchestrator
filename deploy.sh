cd ml-pipe-front
npm install
npm run build
cd ..
docker-compose build
docker-compose up core -d