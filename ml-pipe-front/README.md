**ml-pipe-front**

**Build and Run:**

**Clone the Repository:**

 git clone
 
 cd ml-pipe-front

**Build the Docker Image:**
Run the following command inside the ml-pipe-front folder

docker build -t ml-pipe-front .

**Once the build is done then run the docker container**

docker run -p 3000:80 ml-pipe-front


**Access the frontend:**
open your browser and check http://localhost:3000



**To run locally**

npm install 

npm start

This will run the app in the development mode at http://localhost:3000
